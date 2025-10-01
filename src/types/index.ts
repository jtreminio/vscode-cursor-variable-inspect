/**
 * Type definitions for the Inspect Variable extension
 */

export interface DebugVariable {
    name: string;
    value: string;
    type?: string;
    variablesReference: number;
    evaluateName?: string;
}

export interface VariableContainer {
    variable?: DebugVariable;
    sessionId?: string;
    session?: {
        id: string;
    };
}

export interface WebviewMessage {
    command: string;
    id?: number;
    variablesReference?: number;
    variable?: DebugVariable;
}

export interface ChildrenResponseMessage {
    command: 'childrenResponse';
    id: number;
    variables: DebugVariable[];
}

export interface GetChildrenMessage {
    command: 'getChildren';
    id: number;
    variablesReference: number;
}

export interface InspectVariableMessage {
    command: 'inspectVariable';
    variable: DebugVariable;
}

export const MESSAGE_COMMANDS = {
    GET_CHILDREN: 'getChildren',
    CHILDREN_RESPONSE: 'childrenResponse',
    INSPECT_VARIABLE: 'inspectVariable'
} as const;

