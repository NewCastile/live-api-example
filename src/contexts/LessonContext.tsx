import { createContext, useContext, useReducer } from "react";

export enum LessonState {
  Idle = "IDLE",
  InProgress = "IN_PROGRESS",
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
  completed: Date | null;
  state: InstructionState;
}

export enum LessonContextActions {
  StartLesson = "START_LESSON",
  ResetLesson = "RESET_LESSON",
  MoveToNext = "MOVE_TO_NEXT",
  MoveToPrevious = "MOVE_TO_PREVIOUS",
}

export enum InstructionState {
  Idle = "IDLE",
  InProgress = "IN_PROGRESS",
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
    case LessonContextActions.ResetLesson:
      return markLessonAsIdle({ ctx: state });
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
    task: "Tell the user to open Roblox Studio.",
    verificationTask: "Check the screen and verify if Roblox Studio is opened.",
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the user how to create a new world in Roblox Studio using the baseplate template.",
    verificationTask:
      "Check the screen to verify if the baseplate template is visible.",
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the user how to create a new object in Roblox Studio.",
    verificationTask:
      "Check the screen to see if there is a new object in the Roblox Studio editor.",
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the user how to move the new object.",
    verificationTask:
      "Check the screen and verify if the user moved the object.",
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the user how to scale the new object.",
    verificationTask:
      "Check the screen and verify if the user scaled the object.",
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "Explain to the user how to rotate the new object.",
    verificationTask:
      "Check the screen and verify if the user rotated the object.",
    completed: null,
    state: InstructionState.Idle,
  },
  {
    task: "End the tutorial and ask for feedback.",
    verificationTask:
      "Verify if the user has given feedback about the tutorial.",
    completed: null,
    state: InstructionState.Idle,
  },
];
