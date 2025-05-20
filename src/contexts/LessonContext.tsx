import { createContext, useContext, useReducer } from "react";

export enum LessonState {
  Idle = "IDLE",
  InProgress = "IN_PROGRESS",
  WaitingResponse = "WAITING_RESPONSE",
  Completed = "COMPLETED",
}

export interface LessonContextState {
  instructions: Instruction[];
  state: LessonState;
  currentInstructionIndex: number;
}

export interface LessonContextProps {
  state: LessonContextState;
  dispatch: React.Dispatch<{
    type: LessonContextActions;
  }>;
}

export interface LessonProviderProps {
  initialInstructions: Instruction[];
  children: React.ReactNode;
}

export const LessonContext = createContext<LessonContextProps>({
  state: {
    instructions: [],
    state: LessonState.Idle,
    currentInstructionIndex: 0,
  },
  dispatch: () => {},
});

export interface Instruction {
  task: string;
  verificationTask: string;
  verificationTaskInputType: InstructionVerificationTaskInputType;
  completed: Date | null;
  state: InstructionState;
}

export enum InstructionVerificationTaskInputType {
  Text = "TEXT",
  Audio = "AUDIO",
  Image = "IMAGE",
}

export enum LessonContextActions {
  StartLesson = "START_LESSON",
  ResetLesson = "RESET_LESSON",
  CompleteLesson = "COMPLETE_LESSON",
  WaitForResponse = "WAIT_FOR_RESPONSE",
  MoveToNext = "MOVE_TO_NEXT",
  MoveToPrevious = "MOVE_TO_PREVIOUS",
}

export enum InstructionState {
  Idle = "IDLE",
  InProgress = "IN_PROGRESS",
  WaitingResponse = "WAITING_RESPONSE",
  Completed = "COMPLETED",
}

const moveToNextInstruction = ({
  ctx,
}: {
  ctx: LessonContextState;
}): LessonContextState => {
  const nextInstructionIndex = ctx.currentInstructionIndex + 1;
  if (nextInstructionIndex < ctx.instructions.length) {
    return {
      ...ctx,
      currentInstructionIndex: nextInstructionIndex,
      instructions: ctx.instructions.map((instruction, index) => {
        if (index === ctx.currentInstructionIndex) {
          return markInstructionAsCompleted({ instruction });
        }
        if (index === nextInstructionIndex) {
          return markInstructionAsInProgress({
            instruction,
          });
        }

        return instruction;
      }),
    };
  } else {
    return markLessonAsCompleted({ ctx });
  }
};

const moveToPreviousInstruction = ({
  ctx,
}: {
  ctx: LessonContextState;
}): LessonContextState => {
  const previousInstructionIndex = ctx.currentInstructionIndex - 1;
  if (previousInstructionIndex > 0) {
    return {
      ...ctx,
      currentInstructionIndex: previousInstructionIndex,
      instructions: ctx.instructions.map((instruction, index) => {
        if (index === ctx.currentInstructionIndex) {
          return markInstructionAsIdle({ instruction });
        }
        if (index === previousInstructionIndex) {
          return markInstructionAsInProgress({ instruction });
        }

        return instruction;
      }),
    };
  } else {
    return markLessonAsIdle({ ctx });
  }
};

const markLessonAsIdle = ({
  ctx,
}: {
  ctx: LessonContextState;
}): LessonContextState => {
  return {
    currentInstructionIndex: 0,
    instructions: ctx.instructions.map((instruction) => {
      return markInstructionAsIdle({ instruction });
    }),
    state: LessonState.Idle,
  };
};

const markLessonAsCompleted = ({
  ctx,
}: {
  ctx: LessonContextState;
}): LessonContextState => {
  return {
    ...ctx,
    state: LessonState.Completed,
  };
};

const markInstructionAsIdle = ({
  instruction,
}: {
  instruction: Instruction;
}): Instruction => {
  return {
    ...instruction,
    completed: null,
    state: InstructionState.Idle,
  };
};

const markInstructionAsInProgress = ({
  instruction,
}: {
  instruction: Instruction;
}): Instruction => {
  return {
    ...instruction,
    completed: null,
    state: InstructionState.InProgress,
  };
};

const markInstructionAsCompleted = ({
  instruction,
}: {
  instruction: Instruction;
}): Instruction => {
  return {
    ...instruction,
    completed: new Date(),
    state: InstructionState.Completed,
  };
};

const markInstructionAsWaitingResponse = ({
  instruction,
}: {
  instruction: Instruction;
}): Instruction => {
  return {
    ...instruction,
    state: InstructionState.WaitingResponse,
  };
};

const startLesson = ({
  ctx,
}: {
  ctx: LessonContextState;
}): LessonContextState => {
  return {
    ...ctx,
    instructions: ctx.instructions.map((instruction, index) => {
      if (index === 0) {
        return markInstructionAsInProgress({ instruction });
      }
      if (instruction.state !== InstructionState.Idle) {
        return markInstructionAsIdle({ instruction });
      }
      return instruction;
    }),
    state: LessonState.InProgress,
    currentInstructionIndex: 0,
  };
};

const completeLesson = ({
  ctx,
}: {
  ctx: LessonContextState;
}): LessonContextState => {
  return {
    ...ctx,
    instructions: ctx.instructions.map((instruction) => {
      return markInstructionAsCompleted({ instruction });
    }),
    state: LessonState.Completed,
  };
};

const waitForResponse = ({
  ctx,
}: {
  ctx: LessonContextState;
}): LessonContextState => {
  return {
    ...ctx,
    instructions: ctx.instructions.map((instruction) => {
      if (instruction.state === InstructionState.InProgress) {
        return markInstructionAsWaitingResponse({ instruction });
      }
      return instruction;
    }),
    state: LessonState.WaitingResponse,
  };
};

export const InstructionsReducer = (
  state: LessonContextState,
  action: {
    type: LessonContextActions;
  }
): LessonContextState => {
  switch (action.type) {
    case LessonContextActions.StartLesson:
      return startLesson({ ctx: state });
    case LessonContextActions.MoveToNext:
      return moveToNextInstruction({ ctx: state });
    case LessonContextActions.MoveToPrevious:
      return moveToPreviousInstruction({ ctx: state });
    case LessonContextActions.WaitForResponse:
      return waitForResponse({ ctx: state });
    case LessonContextActions.ResetLesson:
      return markLessonAsIdle({ ctx: state });
    case LessonContextActions.CompleteLesson:
      return completeLesson({ ctx: state });

    default:
      return state;
  }
};

export const LessonProvider = ({
  initialInstructions,
  children,
}: LessonProviderProps) => {
  const [state, dispatch] = useReducer(
    InstructionsReducer,
    {
      instructions: initialInstructions,
      state: LessonState.Idle,
      currentInstructionIndex: 0,
    },
    (state) => state
  );
  return (
    <LessonContext.Provider value={{ state, dispatch }}>
      {children}
    </LessonContext.Provider>
  );
};

export const useLessonContext = () => {
  const context = useContext(LessonContext);
  if (!context) {
    throw new Error("useLessonContext must be used within a LessonProvider");
  }
  return context;
};

export const mockInstructions: Instruction[] = [
  {
    task: "Open Roblox Studio.",
    verificationTask: `Check the student screen and see if the Roblox Studio program is visible
    and shows the different templates available to create a new world. If so, call the "verify_step" function.`,
    verificationTaskInputType: InstructionVerificationTaskInputType.Image,
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: `Create a new world in Roblox Studio using the baseplate template.`,
    verificationTask: `Check the student screen and see if Roblox Studio shows blue sky, 
    a gray plane in a grid pattern and a white flat square platform. If so, call the "verify_step" function.`,
    verificationTaskInputType: InstructionVerificationTaskInputType.Image,
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the student how to create a new object in Roblox Studio.",
    verificationTask: `Check the screen and see if there is a new object in the Roblox Studio editor. 
    In the created world, there should be a new object (either a cube, a sphere or a cylinder) along with the worlds spawn.
    If so, call the "verify_step" function.`,
    verificationTaskInputType: InstructionVerificationTaskInputType.Image,
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the student how to move the new object.",
    verificationTask: `Check the screen and see if the student has selected the object with the Move tool selected and 
    its changing the position of the object by dragging the arrows surrounding the object with the mouse. If
    so call the "verify_step" function.`,
    verificationTaskInputType: InstructionVerificationTaskInputType.Image,
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the student how to scale the new object.",
    verificationTask: `Check the screen and see if the student has selected the object with the Scale tool and its 
    modifying the size of the object by dragging the spheres surrounding the object using the mouse. If so, call the
    "verify_step" function.`,
    verificationTaskInputType: InstructionVerificationTaskInputType.Image,
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the student how to rotate the new object.",
    verificationTask: `Check the screen and see if the student has selected the object with the Rotate tool 
    and its rotating the object by dragging the circles surrounding the object using the mouse.
    If so, call the "verify_step" function.`,
    verificationTaskInputType: InstructionVerificationTaskInputType.Image,
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "End the tutorial and ask for feedback.",
    verificationTask: `Wait for the student to give feedback about the tutorial. Once the student has given his opinion,
    close the tutorial and call the "go_to_next_step" function.`,
    verificationTaskInputType: InstructionVerificationTaskInputType.Text,
    completed: null,
    state: InstructionState.Idle,
  },
];
