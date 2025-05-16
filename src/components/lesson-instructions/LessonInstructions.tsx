import "./lesson-intructions.css";
import { Tool } from "@google/generative-ai";
import { useEffect, useState } from "react";
import {
  ToolCall,
  ToolResponse,
  LiveFunctionResponse,
} from "../../multimodal-live-types";
import {
  LessonContextActions,
  LessonState,
  useLessonContext,
} from "../../contexts/LessonContext";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";
import { useLoggerStore } from "../../lib/store-logger";

// Types

interface ResponseObject extends LiveFunctionResponse {
  name: string;
  response: { result: object };
}

enum FunctionDeclarationNames {
  StartLesson = "start_lesson",
  ResetLesson = "reset_lesson",
  GoToNextStep = "go_to_next_step",
  GoToPreviousStep = "go_to_previous_step",
}

// Tools
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: "start_lesson",
        description:
          "The user says 'Hi, I'm ready to learn!'. Start the lesson.",
      },
      {
        name: "reset_lesson",
        description: "Resets the lesson.",
      },
      {
        name: "go_to_next_step",
        description:
          "Marks the current step as completed and moves to the next step of the lesson.",
      },
      {
        name: "go_to_previous_step",
        description: "Moves to the previous step of the lesson.",
      },
    ],
  },
];

const systemInstructionObject = {
  parts: [
    {
      text: `In this conversation you will guide the user thru a lesson to familiarize the user with the Roblox Studio interface.
      The objective of this lesson is to briefly introduce the Explorer, Properties, Toolbox and Workspace options to the user.
      After that show the user how to add new models and how to use the Move, Scale, and Rotate tools to manipulate the objects 
      in the scene. Use the tools provided to fulfill requests to help modify the list of the steps to follow. Always check that the user has completed the step before 
      going to the next one. Always call any relevant tools *before* speaking.   

      # Checklist guidance:
      - If the user is taking too long to complete a step, give them hints on how to continue
      - If the user demands an answer after taking 5 minutes, give them a hint on how to continue
      - Do not return the list in your conversational response, only via tools
      - Note that the user can also check off the steps using the UI
      - After creating the list, dictate each step to the user thru voice

      When the user greets you with a simple "Hi, I'm ready to learn!". 
      Create the steps to follow for the user, then start the lesson. 
      Wait for the user to complete each of the steps before moving to the next one.
      Check the users screen to validate that they have completed each step.
      Speak as helpfully and concisely as possible. Always call any relevant tools *before* speaking.
      By the end of the conversation, the user will be familiarized with the Roblox Studio interface, how to add models and 
      control them in a very basic level. After finishing the lesson, congratulate the user and close the lesson.
      `,
    },
  ],
};

export default function LessonInstructions() {
  const { state, dispatch } = useLessonContext();
  const { client, setConfig, connect, connected } = useLiveAPIContext();

  const [isAwaitingFirstResponse, setIsAwaitingFirstResponse] = useState(false);
  const [toolResponse, setToolResponse] = useState<ToolResponse | null>(null);

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "text", // switch to "audio" for audio out
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
        },
      },
      systemInstruction: systemInstructionObject,
      tools: toolObject,
    });
  }, [setConfig]);

  useEffect(() => {
    const onToolCall = (toolCall: ToolCall) => {
      console.log({ toolCall });
      const fCalls = toolCall.functionCalls;
      const functionResponses: ResponseObject[] = [];

      if (fCalls.length > 0) {
        fCalls.forEach((fCall) => {
          let functionResponse = {
            id: fCall.id,
            name: fCall.name,
            response: {
              result: { string_value: `${fCall.name} OK.` },
            },
          };
          switch (fCall.name) {
            case FunctionDeclarationNames.StartLesson: {
              dispatch({ type: LessonContextActions.StartLesson });
              break;
            }
            case FunctionDeclarationNames.ResetLesson: {
              dispatch({ type: LessonContextActions.ResetLesson });
              break;
            }
            case FunctionDeclarationNames.GoToNextStep: {
              dispatch({ type: LessonContextActions.MoveToNext });
              break;
            }
            case FunctionDeclarationNames.GoToPreviousStep: {
              dispatch({ type: LessonContextActions.MoveToPrevious });
              break;
            }
          }

          if (functionResponse) {
            functionResponses.push(functionResponse);
          }
        });

        // Send tool responses back to the model
        const toolResponse: ToolResponse = {
          functionResponses: functionResponses,
        };
        setToolResponse(toolResponse);
      }
    };

    setIsAwaitingFirstResponse(false);

    client.on("toolcall", onToolCall);

    return () => {
      client.off("toolcall", onToolCall);
    };
  }, [client, dispatch]);

  useEffect(() => {
    console.log({ toolResponse });
    if (toolResponse) {
      const updatedToolResponse: ToolResponse = {
        ...toolResponse,
        functionResponses: toolResponse.functionResponses.map(
          (functionResponse) => {
            const responseObject = functionResponse as ResponseObject;
            console.log(responseObject);
            return functionResponse;
          }
        ),
      };
      client.sendToolResponse(updatedToolResponse);
      setToolResponse(null);
    }
  }, [toolResponse, client, setToolResponse, state]);

  const start = async () => {
    setIsAwaitingFirstResponse(true);

    if (state.state === LessonState.InProgress) {
      return;
    }

    client.send({
      text: "Start the lesson",
    });
  };

  return (
    <div className="container">
      <div className="lesson-instructions">
        <h2>Lesson Instructions</h2>
        <button
          onClick={async () => {
            await connect();
            start();
          }}
        >
          Start
        </button>
        {connected && <div>Connected</div>}
        {!connected && <div>Not Connected</div>}
        {isAwaitingFirstResponse && (
          <div className="lesson-instructions">
            <div>Waiting for first response...</div>
          </div>
        )}
        <div>{state.state}</div>
        {state.instructions.map((instruction, index) => {
          return (
            <pre key={index}>
              {index + 1}: {JSON.stringify(instruction, null, 2)}
            </pre>
          );
        })}
      </div>
    </div>
  );
}
