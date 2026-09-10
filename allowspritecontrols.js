(function (Scratch) {
    "use strict";

    if (!Scratch.extensions.unsandboxed) {
        throw new Error(
            "AI Sprite Controller must run unsandboxed."
        );
    }

    class AISpriteController {
        constructor() {
            this.runtime = Scratch.vm.runtime;

            this.apiUrl =
                "https://api.groq.com/openai/v1/chat/completions";

            this.apiKey = "";

            this.model =
                "llama-3.3-70b-versatile";

            this.systemPrompt =
                this.getDefaultSystemPrompt();

            this.lastResponse = "";
            this.lastError = "";
            this.thinking = false;

            this.history = [];

            this.lastTarget = null;

            this.customFunctions = [];

            this.lastFunctionName = "";
            this.lastFunctionArguments = [];
            this.lastFunctionContext = null;

            this.functionContexts =
                new WeakMap();
        }

        getInfo() {
            return {
                id: "aispritecontroller",

                name: "AI Sprite Controller",

                color1: "#7A00FF",
                color2: "#6200CC",
                color3: "#4D009F",

                blocks: [

                    {
                        opcode: "setApiKey",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "set AI API key to [KEY]",
                        arguments: {
                            KEY: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue: ""
                            }
                        }
                    },

                    {
                        opcode: "setApiUrl",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "set AI API URL to [URL]",
                        arguments: {
                            URL: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "https://api.groq.com/openai/v1/chat/completions"
                            }
                        }
                    },

                    {
                        opcode: "setModel",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "set AI model to [MODEL]",
                        arguments: {
                            MODEL: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "llama-3.3-70b-versatile"
                            }
                        }
                    },

                    {
                        opcode: "setSystemPrompt",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "set AI system prompt to [PROMPT]",
                        arguments: {
                            PROMPT: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "You control a Scratch sprite."
                            }
                        }
                    },

                    {
                        opcode: "askAI",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "ask AI [MESSAGE]",
                        arguments: {
                            MESSAGE: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "move 10 steps"
                            }
                        }
                    },

                    {
                        opcode: "aiResponse",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "AI response"
                    },

                    {
                        opcode: "aiThinking",
                        blockType:
                            Scratch.BlockType.BOOLEAN,
                        text:
                            "AI is thinking?"
                    },

                    {
                        opcode: "aiError",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "AI error"
                    },

                    {
                        opcode: "clearConversation",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "clear AI conversation"
                    },

                    {
                        opcode: "createFunction",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "create function [NAME] with [ARGS] arguments",
                        arguments: {
                            NAME: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "jump"
                            },

                            ARGS: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    0
                            }
                        }
                    },

                    {
                        opcode: "deleteFunction",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "delete function [NAME]",
                        arguments: {
                            NAME: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                menu:
                                    "functionMenu"
                            }
                        }
                    },

                    {
                        opcode: "functionExists",
                        blockType:
                            Scratch.BlockType.BOOLEAN,
                        text:
                            "function [NAME] exists?",
                        arguments: {
                            NAME: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                menu:
                                    "functionMenu"
                            }
                        }
                    },

                    {
                        opcode: "listFunctions",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "list custom functions"
                    },

                    {
                        /*
                         * IMPORTANT:
                         *
                         * This is deliberately NOT connected to
                         * functionMenu.
                         *
                         * Event hats need a real field/menu when
                         * filtering with startHats. Using the
                         * dynamically generated menu here caused
                         * Gandi/Cocrea to throw:
                         *
                         * Cannot read properties of undefined
                         * (reading 'value')
                         *
                         * The function name can simply be typed here.
                         */
                        opcode: "whenFunctionReceived",
                        blockType:
                            Scratch.BlockType.HAT,
                        text:
                            "when function received [FUNCTION]",
                        isEdgeActivated: false,
                        shouldRestartExistingThreads: true,

                        arguments: {
                            FUNCTION: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "jump"
                            }
                        }
                    },

                    {
                        opcode: "functionArgument",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "function argument [INDEX]",
                        arguments: {
                            INDEX: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    1
                            }
                        }
                    },

                    {
                        opcode: "functionArgumentElse",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "function argument [INDEX] else [FALLBACK]",
                        arguments: {
                            INDEX: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    1
                            },

                            FALLBACK: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    ""
                            }
                        }
                    },

                    {
                        opcode: "lastFunctionReceived",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "last function received"
                    },

                    {
                        opcode: "say",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI say [TEXT]",
                        arguments: {
                            TEXT: {
                                type:
                                    Scratch.ArgumentType.STRING
                            }
                        }
                    },

                    {
                        opcode: "move",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI move [STEPS] steps",
                        arguments: {
                            STEPS: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "goto",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI go to x [X] y [Y]",
                        arguments: {
                            X: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            },

                            Y: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "changeX",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI change x by [VALUE]",
                        arguments: {
                            VALUE: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "changeY",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI change y by [VALUE]",
                        arguments: {
                            VALUE: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "setX",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI set x to [VALUE]",
                        arguments: {
                            VALUE: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "setY",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI set y to [VALUE]",
                        arguments: {
                            VALUE: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "turn",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI turn [DEGREES] degrees",
                        arguments: {
                            DEGREES: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "setDirection",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI point in direction [DIRECTION]",
                        arguments: {
                            DIRECTION: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "nextCostume",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI next costume"
                    },

                    {
                        opcode: "switchCostume",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI switch costume to [COSTUME]",
                        arguments: {
                            COSTUME: {
                                type:
                                    Scratch.ArgumentType.STRING
                            }
                        }
                    },

                    {
                        opcode: "changeSize",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI change size by [VALUE]",
                        arguments: {
                            VALUE: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "setSize",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI set size to [VALUE] %",
                        arguments: {
                            VALUE: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    },

                    {
                        opcode: "show",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI show"
                    },

                    {
                        opcode: "hide",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI hide"
                    },

                    {
                        opcode: "wait",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI wait [SECONDS] seconds",
                        arguments: {
                            SECONDS: {
                                type:
                                    Scratch.ArgumentType.NUMBER
                            }
                        }
                    }
                ],

                menus: {
                    functionMenu: {
                        acceptReporters: false,

                        items:
                            "getFunctionMenuItems"
                    }
                }
            };
        }

        getFunctionMenuItems() {
            if (
                !this.customFunctions ||
                this.customFunctions.length === 0
            ) {
                return [
                    {
                        text: "no functions",
                        value: ""
                    }
                ];
            }

            return this.customFunctions.map(
                function (func) {
                    return {
                        text:
                            func.name +
                            " (" +
                            func.argumentCount +
                            ")",
                        value:
                            func.name
                    };
                }
            );
        }

        setApiKey(args) {
            this.apiKey =
                String(args.KEY || "");
        }

        setApiUrl(args) {
            this.apiUrl =
                String(args.URL || "");
        }

        setModel(args) {
            this.model =
                String(args.MODEL || "");
        }

        setSystemPrompt(args) {
            this.systemPrompt =
                String(args.PROMPT || "");
        }

        getDefaultSystemPrompt() {
            return `
You are an AI controller for a Scratch/Gandi sprite.

You MUST respond with valid JSON.

Your response must contain exactly one JSON object.

Do not use Markdown.

Do not use code fences.

Do not explain your answer.

The JSON object MUST contain an "action" property.

VALID ACTIONS:

say
move
goto
change_x
change_y
set_x
set_y
turn
set_direction
next_costume
switch_costume
change_size
set_size
show
hide
wait
function

COMMAND FORMATS:

{"action":"say","text":"Hello"}

{"action":"move","steps":10}

{"action":"goto","x":0,"y":0}

{"action":"change_x","value":10}

{"action":"change_y","value":10}

{"action":"set_x","value":0}

{"action":"set_y","value":0}

{"action":"turn","degrees":15}

{"action":"set_direction","direction":90}

{"action":"next_costume"}

{"action":"switch_costume","costume":"costume2"}

{"action":"change_size","value":10}

{"action":"set_size","value":100}

{"action":"show"}

{"action":"hide"}

{"action":"wait","seconds":1}

CUSTOM FUNCTIONS:

If a custom function exists, use:

{
    "action":"function",
    "name":"FUNCTION_NAME",
    "arguments":[]
}

For functions with arguments:

{
    "action":"function",
    "name":"FUNCTION_NAME",
    "arguments":[VALUE1,VALUE2]
}

Only call functions that are explicitly listed as available.

The number of arguments MUST exactly match the function definition.

Always return JSON.
`;
        }

        getCompleteSystemPrompt() {
            let prompt =
                this.systemPrompt ||
                this.getDefaultSystemPrompt();

            prompt += `

IMPORTANT JSON REQUIREMENT:

Your entire response MUST be valid JSON.

The word JSON refers to JavaScript Object Notation.

Do not output anything outside the JSON object.

VALID ACTIONS:
say
move
goto
change_x
change_y
set_x
set_y
turn
set_direction
next_costume
switch_costume
change_size
set_size
show
hide
wait
function
`;

            if (
                this.customFunctions &&
                this.customFunctions.length > 0
            ) {
                prompt += `

AVAILABLE CUSTOM FUNCTIONS:
`;

                for (
                    const func
                    of this.customFunctions
                ) {
                    prompt +=
                        `- ${func.name}: ` +
                        `${func.argumentCount} argument(s)\n`;
                }

                prompt += `

CUSTOM FUNCTION RULE:

To call a custom function, return:

{
    "action": "function",
    "name": "FUNCTION_NAME",
    "arguments": []
}

The "name" must exactly match an available
custom function.

The "arguments" array must contain exactly
the number of arguments required by that function.

Do not invent function names.
`;
            }

            return prompt;
        }

        async askAI(args, util) {
            const message =
                String(args.MESSAGE || "").trim();

            this.lastError = "";
            this.thinking = true;

            if (!this.apiKey) {
                this.lastError =
                    "API key is not set.";
                this.thinking = false;
                return;
            }

            try {
                const messages = [
                    {
                        role: "system",
                        content:
                            this.getCompleteSystemPrompt()
                    },

                    ...this.history,

                    {
                        role: "user",
                        content: message
                    }
                ];

                const response =
                    await fetch(
                        this.apiUrl,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json",

                                "Authorization":
                                    "Bearer " +
                                    this.apiKey
                            },

                            body:
                                JSON.stringify({
                                    model:
                                        this.model,

                                    messages:
                                        messages,

                                    temperature: 0,

                                    response_format: {
                                        type:
                                            "json_object"
                                    }
                                })
                        }
                    );

                const rawText =
                    await response.text();

                let data;

                try {
                    data =
                        JSON.parse(rawText);
                } catch (error) {
                    throw new Error(
                        "Invalid JSON returned by AI API: " +
                        rawText
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        "HTTP " +
                        response.status +
                        ": " +
                        rawText
                    );
                }

                const content =
                    data &&
                    data.choices &&
                    data.choices[0] &&
                    data.choices[0].message &&
                    data.choices[0].message.content;

                if (!content) {
                    throw new Error(
                        "AI returned no message content."
                    );
                }

                const command =
                    this.parseAICommand(
                        content
                    );

                if (!command) {
                    throw new Error(
                        "AI returned an invalid command: " +
                        content
                    );
                }

                this.lastResponse =
                    JSON.stringify(command);

                this.history.push({
                    role: "user",
                    content: message
                });

                this.history.push({
                    role: "assistant",
                    content:
                        JSON.stringify(command)
                });

                /*
                 * Keep history reasonably small.
                 */
                if (this.history.length > 30) {
                    this.history =
                        this.history.slice(-30);
                }

                const target =
                    this.getTarget(util);

                if (target) {
                    this.lastTarget =
                        target;

                    await this.executeCommand(
                        command,
                        target,
                        util
                    );
                }
            } catch (error) {
                this.lastError =
                    error &&
                    error.message
                        ? error.message
                        : String(error);

                console.error(
                    "AI Sprite Controller:",
                    error
                );
            } finally {
                this.thinking = false;
            }
        }

        parseAICommand(content) {
            let text =
                String(content || "").trim();

            /*
             * Remove Markdown fences if an API/model
             * ignores the JSON-only instruction.
             */
            if (
                text.startsWith("```")
            ) {
                text =
                    text.replace(
                        /^```(?:json)?/i,
                        ""
                    );

                text =
                    text.replace(
                        /```$/i,
                        ""
                    );

                text =
                    text.trim();
            }

            let parsed;

            try {
                parsed =
                    JSON.parse(text);
            } catch (error) {
                /*
                 * Try extracting the first JSON object.
                 */
                const first =
                    text.indexOf("{");

                const last =
                    text.lastIndexOf("}");

                if (
                    first === -1 ||
                    last === -1 ||
                    last <= first
                ) {
                    return null;
                }

                try {
                    parsed =
                        JSON.parse(
                            text.slice(
                                first,
                                last + 1
                            )
                        );
                } catch (error2) {
                    return null;
                }
            }

            return this.normalizeCommand(
                parsed
            );
        }

        normalizeCommand(command) {
            if (
                !command ||
                typeof command !== "object"
            ) {
                return null;
            }

            const action =
                String(
                    command.action || ""
                ).trim();

            const validActions = [
                "say",
                "move",
                "goto",
                "change_x",
                "change_y",
                "set_x",
                "set_y",
                "turn",
                "set_direction",
                "next_costume",
                "switch_costume",
                "change_size",
                "set_size",
                "show",
                "hide",
                "wait",
                "function"
            ];

            if (
                !validActions.includes(action)
            ) {
                return null;
            }

            switch (action) {
                case "say":
                    return {
                        action: "say",
                        text:
                            String(
                                command.text ??
                                ""
                            )
                    };

                case "move":
                    return {
                        action: "move",
                        steps:
                            Number(
                                command.steps ??
                                0
                            )
                    };

                case "goto":
                    return {
                        action: "goto",
                        x:
                            Number(
                                command.x ??
                                0
                            ),
                        y:
                            Number(
                                command.y ??
                                0
                            )
                    };

                case "change_x":
                    return {
                        action: "change_x",
                        value:
                            Number(
                                command.value ??
                                0
                            )
                    };

                case "change_y":
                    return {
                        action: "change_y",
                        value:
                            Number(
                                command.value ??
                                0
                            )
                    };

                case "set_x":
                    return {
                        action: "set_x",
                        value:
                            Number(
                                command.value ??
                                0
                            )
                    };

                case "set_y":
                    return {
                        action: "set_y",
                        value:
                            Number(
                                command.value ??
                                0
                            )
                    };

                case "turn":
                    return {
                        action: "turn",
                        degrees:
                            Number(
                                command.degrees ??
                                0
                            )
                    };

                case "set_direction":
                    return {
                        action:
                            "set_direction",
                        direction:
                            Number(
                                command.direction ??
                                90
                            )
                    };

                case "next_costume":
                    return {
                        action:
                            "next_costume"
                    };

                case "switch_costume":
                    return {
                        action:
                            "switch_costume",
                        costume:
                            String(
                                command.costume ??
                                ""
                            )
                    };

                case "change_size":
                    return {
                        action:
                            "change_size",
                        value:
                            Number(
                                command.value ??
                                0
                            )
                    };

                case "set_size":
                    return {
                        action:
                            "set_size",
                        value:
                            Number(
                                command.value ??
                                100
                            )
                    };

                case "show":
                    return {
                        action: "show"
                    };

                case "hide":
                    return {
                        action: "hide"
                    };

                case "wait":
                    return {
                        action: "wait",
                        seconds:
                            Number(
                                command.seconds ??
                                0
                            )
                    };

                case "function": {
                    const name =
                        String(
                            command.name ??
                            command.function ??
                            ""
                        ).trim();

                    if (!name) {
                        return null;
                    }

                    const functionDefinition =
                        this.customFunctions.find(
                            func =>
                                func.name.toLowerCase() ===
                                name.toLowerCase()
                        );

                    if (!functionDefinition) {
                        return null;
                    }

                    const functionArguments =
                        Array.isArray(
                            command.arguments
                        )
                            ? command.arguments
                            : [];

                    if (
                        functionArguments.length !==
                        functionDefinition.argumentCount
                    ) {
                        return null;
                    }

                    return {
                        action: "function",
                        name:
                            functionDefinition.name,
                        arguments:
                            functionArguments
                    };
                }

                default:
                    return null;
            }
        }

        getTarget(util) {
            if (
                util &&
                util.target
            ) {
                return util.target;
            }

            if (this.lastTarget) {
                return this.lastTarget;
            }

            const targets =
                this.runtime &&
                this.runtime.targets
                    ? this.runtime.targets
                    : [];

            return (
                targets.find(
                    target =>
                        target &&
                        !target.isStage &&
                        !target.isClone
                ) ||
                targets.find(
                    target =>
                        target &&
                        !target.isStage
                ) ||
                null
            );
        }

        async executeCommand(
            command,
            target,
            util
        ) {
            if (!target) {
                throw new Error(
                    "No sprite target is available."
                );
            }

            switch (command.action) {

                case "say":
                    target.say(
                        command.text
                    );
                    break;

                case "move":
                    target.setXY(
                        target.x +
                            command.steps *
                            Math.cos(
                                target.direction *
                                Math.PI /
                                180
                            ),
                        target.y +
                            command.steps *
                            Math.sin(
                                target.direction *
                                Math.PI /
                                180
                            )
                    );
                    break;

                case "goto":
                    target.setXY(
                        command.x,
                        command.y
                    );
                    break;

                case "change_x":
                    target.setXY(
                        target.x +
                            command.value,
                        target.y
                    );
                    break;

                case "change_y":
                    target.setXY(
                        target.x,
                        target.y +
                            command.value
                    );
                    break;

                case "set_x":
                    target.setXY(
                        command.value,
                        target.y
                    );
                    break;

                case "set_y":
                    target.setXY(
                        target.x,
                        command.value
                    );
                    break;

                case "turn":
                    target.setDirection(
                        target.direction +
                            command.degrees
                    );
                    break;

                case "set_direction":
                    target.setDirection(
                        command.direction
                    );
                    break;

                case "next_costume":
                    target.setCostume(
                        target.currentCostume +
                        1
                    );
                    break;

                case "switch_costume":
                    this.switchCostume(
                        target,
                        command.costume
                    );
                    break;

                case "change_size":
                    target.setSize(
                        target.size +
                            command.value
                    );
                    break;

                case "set_size":
                    target.setSize(
                        command.value
                    );
                    break;

                case "show":
                    target.setVisible(
                        true
                    );
                    break;

                case "hide":
                    target.setVisible(
                        false
                    );
                    break;

                case "wait":
                    await this.wait(
                        command.seconds
                    );
                    break;

                case "function":
                    this.fireFunction(
                        command.name,
                        command.arguments,
                        util
                    );
                    break;
            }
        }

        switchCostume(
            target,
            costume
        ) {
            const costumes =
                target.getCostumes
                    ? target.getCostumes()
                    : null;

            if (
                costumes &&
                Array.isArray(costumes)
            ) {
                const index =
                    costumes.findIndex(
                        item =>
                            item &&
                            (
                                item.name ===
                                costume ||
                                item.md5 ===
                                costume
                            )
                    );

                if (index >= 0) {
                    target.setCostume(
                        index
                    );

                    return;
                }
            }

            /*
             * Try direct costume name support.
             */
            try {
                target.setCostume(
                    costume
                );
            } catch (error) {
                /*
                 * Ignore invalid costume names.
                 */
            }
        }

        wait(seconds) {
            seconds =
                Number(seconds);

            if (
                !Number.isFinite(seconds) ||
                seconds < 0
            ) {
                seconds = 0;
            }

            return new Promise(
                resolve => {
                    setTimeout(
                        resolve,
                        seconds * 1000
                    );
                }
            );
        }

        createFunction(args) {
            const name =
                String(
                    args.NAME || ""
                ).trim();

            let argumentCount =
                Number(args.ARGS);

            if (!name) {
                return;
            }

            if (
                !Number.isFinite(
                    argumentCount
                )
            ) {
                argumentCount = 0;
            }

            argumentCount =
                Math.max(
                    0,
                    Math.floor(
                        argumentCount
                    )
                );

            const existing =
                this.customFunctions.find(
                    func =>
                        func.name.toLowerCase() ===
                        name.toLowerCase()
                );

            if (existing) {
                existing.argumentCount =
                    argumentCount;
            } else {
                this.customFunctions.push({
                    name: name,
                    argumentCount:
                        argumentCount
                });
            }
        }

        deleteFunction(args) {
            const name =
                String(
                    args.NAME || ""
                ).trim();

            this.customFunctions =
                this.customFunctions.filter(
                    func =>
                        func.name.toLowerCase() !==
                        name.toLowerCase()
                );
        }

        functionExists(args) {
            const name =
                String(
                    args.NAME || ""
                ).trim();

            return this.customFunctions.some(
                func =>
                    func.name.toLowerCase() ===
                    name.toLowerCase()
            );
        }

        listFunctions() {
            return this.customFunctions
                .map(
                    func =>
                        func.name
                )
                .join(", ");
        }

        /*
         * This is the fixed custom-function trigger.
         *
         * It uses util.startHats() when this function
         * was called from a running block. This is the
         * recommended API for starting hats from inside
         * an extension block.
         */
        fireFunction(
            name,
            argumentsList,
            util
        ) {
            name =
                String(
                    name || ""
                ).trim();

            if (!name) {
                return;
            }

            if (
                !Array.isArray(
                    argumentsList
                )
            ) {
                argumentsList = [];
            }

            const functionDefinition =
                this.customFunctions.find(
                    func =>
                        func.name.toLowerCase() ===
                        name.toLowerCase()
                );

            if (!functionDefinition) {
                return;
            }

            /*
             * Do not fire the function if the
             * argument count is incorrect.
             */
            if (
                argumentsList.length !==
                functionDefinition.argumentCount
            ) {
                this.lastError =
                    "Function '" +
                    functionDefinition.name +
                    "' requires " +
                    functionDefinition.argumentCount +
                    " argument(s), but received " +
                    argumentsList.length +
                    ".";

                return;
            }

            this.lastFunctionName =
                functionDefinition.name;

            this.lastFunctionArguments =
                argumentsList.slice();

            const context = {
                name:
                    functionDefinition.name,

                arguments:
                    argumentsList.slice()
            };

            this.lastFunctionContext =
                context;

            let threads = [];

            try {
                /*
                 * Prefer util.startHats().
                 *
                 * This is important when fireFunction
                 * was called from askAI().
                 */
                if (
                    util &&
                    typeof util.startHats ===
                        "function"
                ) {
                    threads =
                        util.startHats(
                            "aispritecontroller_whenFunctionReceived",
                            {
                                FUNCTION:
                                    functionDefinition.name
                            }
                        );
                } else if (
                    this.runtime &&
                    typeof this.runtime.startHats ===
                        "function"
                ) {
                    threads =
                        this.runtime.startHats(
                            "aispritecontroller_whenFunctionReceived",
                            {
                                FUNCTION:
                                    functionDefinition.name
                            }
                        );
                }
            } catch (error) {
                this.lastError =
                    error &&
                    error.message
                        ? error.message
                        : String(error);

                console.error(
                    "AI Sprite Controller function error:",
                    error
                );

                return;
            }

            for (
                const thread of
                threads || []
            ) {
                if (thread) {
                    this.functionContexts.set(
                        thread,
                        context
                    );
                }
            }
        }

        getFunctionContext(util) {
            if (
                !util ||
                !util.thread
            ) {
                return (
                    this.lastFunctionContext ||
                    null
                );
            }

            let thread =
                util.thread;

            /*
             * Check the current thread and
             * its parent threads.
             */
            while (thread) {
                const context =
                    this.functionContexts.get(
                        thread
                    );

                if (context) {
                    return context;
                }

                thread =
                    thread.parentThread;
            }

            return (
                this.lastFunctionContext ||
                null
            );
        }

        functionArgument(args, util) {
            const index =
                Math.max(
                    1,
                    Math.floor(
                        Number(
                            args.INDEX
                        ) || 1
                    )
                );

            const context =
                this.getFunctionContext(
                    util
                );

            if (!context) {
                return "";
            }

            const value =
                context.arguments[
                    index - 1
                ];

            if (
                value === undefined ||
                value === null
            ) {
                return "";
            }

            return value;
        }

        functionArgumentElse(
            args,
            util
        ) {
            const index =
                Math.max(
                    1,
                    Math.floor(
                        Number(
                            args.INDEX
                        ) || 1
                    )
                );

            const fallback =
                args.FALLBACK === undefined
                    ? ""
                    : args.FALLBACK;

            const context =
                this.getFunctionContext(
                    util
                );

            if (!context) {
                return fallback;
            }

            const value =
                context.arguments[
                    index - 1
                ];

            if (
                value === undefined ||
                value === null ||
                value === ""
            ) {
                return fallback;
            }

            return value;
        }

        lastFunctionReceived() {
            return (
                this.lastFunctionName ||
                ""
            );
        }

        aiResponse() {
            return (
                this.lastResponse ||
                ""
            );
        }

        aiThinking() {
            return this.thinking;
        }

        aiError() {
            return (
                this.lastError ||
                ""
            );
        }

        clearConversation() {
            this.history = [];
            this.lastResponse = "";
            this.lastError = "";
        }
    }

    Scratch.extensions.register(
        new AISpriteController()
    );

})(Scratch);
