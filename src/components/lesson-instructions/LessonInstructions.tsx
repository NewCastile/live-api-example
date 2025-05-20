import "./lesson-intructions.css";
import { SchemaType, Tool } from "@google/generative-ai";
import { useEffect, useState } from "react";
import {
  ToolCall,
  ToolResponse,
  LiveFunctionResponse,
} from "../../multimodal-live-types";
import {
  LessonContextActions,
  LessonState,
  mockInstructions,
  useLessonContext,
} from "../../contexts/LessonContext";
import { useLiveAPIContext } from "../../contexts/LiveAPIContext";

// Types
interface ResponseObject extends LiveFunctionResponse {
  name: string;
  response: { result: object };
}

export enum FunctionDeclarationNames {
  StartLesson = "start_lesson",
  ResetLesson = "reset_lesson",
  CompleteLesson = "complete_lesson",
  VerifyStep = "verify_step",
  GoToNextStep = "go_to_next_step",
  GoToPreviousStep = "go_to_previous_step",
  ProgramOpened = "program_opened",
}

// Tools
const toolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: FunctionDeclarationNames.StartLesson,
        description:
          "The user says 'Hi, I'm ready to learn!'. Start the lesson.",
      },
      {
        name: FunctionDeclarationNames.ResetLesson,
        description: "Resets the lesson and marks al it's steps as idle.",
      },
      {
        name: FunctionDeclarationNames.CompleteLesson,
        description: "Marks the lesson and all it's steps as completed.",
      },
      {
        name: FunctionDeclarationNames.VerifyStep,
        description:
          "Based on the current step verification task, verify if the user has completed it.",
      },
      {
        name: FunctionDeclarationNames.GoToNextStep,
        description:
          "Marks the current step as completed and moves to the next step of the lesson.",
      },
      {
        name: FunctionDeclarationNames.GoToPreviousStep,
        description: "Moves to the previous step of the lesson.",
      },
    ],
  },
];

const systemInstructionObject = {
  parts: [
    {
      text: `In this conversation you will be a teacher for a 8-10 year old kid.
      You will start the lesson only when the student is ready, for this, wait for the student to say
      something like "I'm ready to start the lesson".
      The objective of this lesson is to briefly introduce the student to the Roblox Studio interface.
      Then student will be sharing his screen to you for you to assist and instruct him on how to complete
      each step of the lesson.
      You will process and interpret the student's screen and his activity to ensure that he is following
      the given instructions accordingly.
      The only pre-requisite for this lesson in particular is to have Roblox Studio installed.
      You will wait patiently for the student to complete the instructions, try not to interrupt him
      or saturate him with too many questions or instructions, instead, give the instructions once
      and stay quiet until the student has completed the instruction.
      Here is a list of the steps to follow in order to complete the lesson:

      ${mockInstructions.map((instruction, index) => {
        return `${index + 1}. ${
          instruction.task
        }. To verify this has been done: ${instruction.verificationTask}`;
      })}

      You will:
      * Speak as helpfully and concisely as possible.
      * Wait for the student to complete the instruction given on the moment for atleast 3 minutes.
      * Only repeat the instructions when the student ask for it.
      * Call the apropiate tool to move to the next step if the current step has been completed.

      After finishing the lesson, congratulate the student, ask for feedback and close the lesson.
      `,
    },
  ],
};

const reactiveClientInstructionObject = {
  parts: [
    {
      text: `Your job would be to interact with the user screen, detect, name and describe the programs the user opens
      or that are visible on the screen.
      Use the provided tools to detect this specifics scenarios and send the result to the model.`,
    },
  ],
};

const reactiveClientToolObject: Tool[] = [
  {
    functionDeclarations: [
      {
        name: FunctionDeclarationNames.ProgramOpened,
        description: `Check if there is a program opened. In this case, send the result to the model providing the program name
        and describe the program interface.`,
        parameters: {
          type: SchemaType.OBJECT,
          properties: {
            program_name: {
              type: SchemaType.STRING,
              description: "The name of the program opened.",
            },
            program_interface: {
              type: SchemaType.STRING,
              description: "The interface of the program opened.",
            },
          },
          required: ["program_name", "program_interface"],
        },
      },
    ],
  },
];

export default function LessonInstructions() {
  const { state, dispatch } = useLessonContext();
  const { client, setConfig, connect, connected } = useLiveAPIContext();

  const [isAwaitingFirstResponse, setIsAwaitingFirstResponse] = useState(false);
  const [toolResponse, setToolResponse] = useState<ToolResponse | null>(null);

  useEffect(() => {
    setConfig({
      model: "models/gemini-2.0-flash-exp",
      generationConfig: {
        responseModalities: "audio", // switch to "audio" for audio out
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
      console.log("tool call");
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
              dispatch({
                type: LessonContextActions.StartLesson,
              });
              break;
            }
            case FunctionDeclarationNames.ResetLesson: {
              dispatch({
                type: LessonContextActions.ResetLesson,
              });
              break;
            }
            case FunctionDeclarationNames.CompleteLesson: {
              dispatch({
                type: LessonContextActions.CompleteLesson,
              });
              break;
            }
            case FunctionDeclarationNames.VerifyStep: {
              dispatch({
                type: LessonContextActions.MoveToNext,
              });
              break;
            }
            case FunctionDeclarationNames.GoToNextStep: {
              dispatch({
                type: LessonContextActions.MoveToNext,
              });
              break;
            }
            case FunctionDeclarationNames.GoToPreviousStep: {
              dispatch({
                type: LessonContextActions.MoveToPrevious,
              });
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
    if (toolResponse) {
      const updatedToolResponse: ToolResponse = {
        ...toolResponse,
        functionResponses: toolResponse.functionResponses.map(
          (functionResponse) => {
            const responseObject = functionResponse as ResponseObject;
            console.log("responseObject", responseObject);
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

    client.send([{ text: "Hello, I'm ready to learn!" }]);
  };

  return (
    <div className="container">
      <div className="lesson-instructions">
        <h2>Lesson Instructions</h2>
        <button
          disabled={state.state === LessonState.InProgress}
          onClick={async () => {
            if (!connected) {
              await connect();
            }
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
            <pre key={index} style={{ width: "100px" }}>
              {index + 1}: {JSON.stringify(instruction, null, 2)}
            </pre>
          );
        })}
      </div>
    </div>
  );
}
