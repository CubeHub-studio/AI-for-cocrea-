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

            this.functionContexts = new WeakMap();
        }

        getInfo() {
            return {
                id: "aispritecontroller",
                name: "AI Sprite Controller",

                color1: "#10b981",
                color2: "#059669",
                color3: "#047857",

                blocks: [
                    {
                        opcode: "setApiKey",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set API key to [KEY]",
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "gsk_..."
                            }
                        }
                    },

                    {
                        opcode: "setApiUrl",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set AI API URL to [URL]",
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "https://api.groq.com/openai/v1/chat/completions"
                            }
                        }
                    },

                    {
                        opcode: "setModel",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set AI model to [MODEL]",
                        arguments: {
                            MODEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "llama-3.3-70b-versatile"
                            }
                        }
                    },

                    {
                        opcode: "setSystemPrompt",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "set AI system prompt to [PROMPT]",
                        arguments: {
                            PROMPT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "You control a Scratch sprite."
                            }
                        }
                    },

                    {
                        opcode: "askAI",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "ask AI [MESSAGE]",
                        arguments: {
                            MESSAGE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "next costume"
                            }
                        }
                    },

                    {
                        opcode: "aiResponse",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "AI response"
                    },

                    {
                        opcode: "aiIsThinking",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "AI is thinking?"
                    },

                    {
                        opcode: "lastError",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "AI error"
                    },

                    {
                        opcode: "clearConversation",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "clear AI conversation"
                    },

                    {
                        opcode: "createFunction",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "create function [NAME] with [ARGUMENTS] arguments",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "jump"
                            },

                            ARGUMENTS: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    },

                    {
                        opcode: "deleteFunction",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "delete function [NAME]",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "functionMenu"
                            }
                        }
                    },

                    {
                        opcode: "functionExists",
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: "function [NAME] exists?",
                        arguments: {
                            NAME: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "functionMenu"
                            }
                        }
                    },

                    {
                        opcode: "functionList",
                        blockType: Scratch.BlockType.REPORTER,
                        text: "custom function list"
                    },

                    {
                        opcode: "whenFunctionReceived",
                        blockType: Scratch.BlockType.HAT,
                        text:
                            "when function received [FUNCTION]",
                        isEdgeActivated: false,
                        shouldRestartExistingThreads: true,
                        arguments: {
                            FUNCTION: {
                                type: Scratch.ArgumentType.STRING,
                                menu: "functionMenu"
                            }
                        }
                    },

                    {
                        opcode: "functionArgument",
                        blockType: Scratch.BlockType.REPORTER,
                        text:
                            "function argument [INDEX]",
                        arguments: {
                            INDEX: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },

                    {
                        opcode: "functionArgumentElse",
                        blockType: Scratch.BlockType.REPORTER,
                        text:
                            "function argument [INDEX] else [FALLBACK]",
                        arguments: {
                            INDEX: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            },

                            FALLBACK: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ""
                            }
                        }
                    },

                    {
                        opcode: "lastFunctionReceived",
                        blockType: Scratch.BlockType.REPORTER,
                        text:
                            "last function received"
                    },

                    {
                        opcode: "say",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite say [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "Hello!"
                            }
                        }
                    },

                    {
                        opcode: "move",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite move [STEPS] steps",
                        arguments: {
                            STEPS: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        }
                    },

                    {
                        opcode: "goTo",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite go to x: [X] y: [Y]",
                        arguments: {
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            },

                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    },

                    {
                        opcode: "changeX",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite change x by [VALUE]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        }
                    },

                    {
                        opcode: "changeY",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite change y by [VALUE]",
                        arguments: {
                            VALUE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        }
                    },

                    {
                        opcode: "setX",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite set x to [X]",
                        arguments: {
                            X: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    },

                    {
                        opcode: "setY",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite set y to [Y]",
                        arguments: {
                            Y: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        }
                    },

                    {
                        opcode: "turn",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite turn [DEGREES] degrees",
                        arguments: {
                            DEGREES: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 15
                            }
                        }
                    },

                    {
                        opcode: "pointDirection",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite point in direction [DIRECTION]",
                        arguments: {
                            DIRECTION: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 90
                            }
                        }
                    },

                    {
                        opcode: "nextCostume",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite next costume"
                    },

                    {
                        opcode: "switchCostume",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite switch costume to [COSTUME]",
                        arguments: {
                            COSTUME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "costume1"
                            }
                        }
                    },

                    {
                        opcode: "changeSize",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite change size by [SIZE]",
                        arguments: {
                            SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        }
                    },

                    {
                        opcode: "setSize",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite set size to [SIZE] %",
                        arguments: {
                            SIZE: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 100
                            }
                        }
                    },

                    {
                        opcode: "show",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite show"
                    },

                    {
                        opcode: "hide",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite hide"
                    },

                    {
                        opcode: "wait",
                        blockType: Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite wait [SECONDS] seconds",
                        arguments: {
                            SECONDS: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    }
                ],

                menus: {
                    functionMenu: {
                        acceptReporters: true,
                        items: "getFunctionNames"
                    }
                }
            };
        }

        getDefaultSystemPrompt() {
            return `
You are a STRICT JSON command generator for a Scratch/Gandi sprite.

The word JSON means JavaScript Object Notation.

YOUR ENTIRE RESPONSE MUST BE EXACTLY ONE VALID JSON OBJECT.

NEVER respond with normal conversation.

NEVER explain anything.

NEVER use Markdown.

NEVER use code fences.

NEVER put text before the JSON.

NEVER put text after the JSON.

NEVER return an array as the top-level response.

EVERY response must be exactly one JSON object.

==================================================
VALID ACTIONS
==================================================

The ONLY valid values for "action" are:

"say"
"move"
"goto"
"change_x"
"change_y"
"set_x"
"set_y"
"turn"
"set_direction"
"next_costume"
"switch_costume"
"change_size"
"set_size"
"show"
"hide"
"wait"
"function"

NEVER invent another action.

==================================================
COMMAND 1: SAY
==================================================

JSON:

{"action":"say","text":"Hello!"}

The "text" property must contain what the sprite should say.

Example:

User:
say hello world

JSON:
{"action":"say","text":"Hello world"}

==================================================
COMMAND 2: MOVE
==================================================

JSON:

{"action":"move","steps":10}

"steps" must be a number.

Example:

User:
move forward 25 steps

JSON:
{"action":"move","steps":25}

==================================================
COMMAND 3: GOTO
==================================================

JSON:

{"action":"goto","x":100,"y":50}

"x" and "y" must be numbers.

Example:

User:
go to x 100 y 50

JSON:
{"action":"goto","x":100,"y":50}

==================================================
COMMAND 4: CHANGE X
==================================================

JSON:

{"action":"change_x","amount":10}

Example:

User:
move right 20

JSON:
{"action":"change_x","amount":20}

Move left:

{"action":"change_x","amount":-20}

==================================================
COMMAND 5: CHANGE Y
==================================================

JSON:

{"action":"change_y","amount":10}

Example:

User:
move up 20

JSON:
{"action":"change_y","amount":20}

Move down:

{"action":"change_y","amount":-20}

==================================================
COMMAND 6: SET X
==================================================

JSON:

{"action":"set_x","x":100}

==================================================
COMMAND 7: SET Y
==================================================

JSON:

{"action":"set_y","y":50}

==================================================
COMMAND 8: TURN
==================================================

JSON:

{"action":"turn","degrees":15}

This changes the direction relative to the current direction.

==================================================
COMMAND 9: SET DIRECTION
==================================================

JSON:

{"action":"set_direction","degrees":90}

This points the sprite in an exact direction.

==================================================
COMMAND 10: NEXT COSTUME
==================================================

JSON:

{"action":"next_costume"}

Use this for:

next costume
change costume
go to next costume
switch to next costume
use the next costume

Example:

User:
next costume

JSON:
{"action":"next_costume"}

==================================================
COMMAND 11: SWITCH COSTUME
==================================================

JSON:

{"action":"switch_costume","costume":"costume2"}

The costume may be a name or number.

Example:

User:
switch to costume 2

JSON:
{"action":"switch_costume","costume":"2"}

Example:

User:
switch to costume2

JSON:
{"action":"switch_costume","costume":"costume2"}

==================================================
COMMAND 12: CHANGE SIZE
==================================================

JSON:

{"action":"change_size","amount":10}

Increase:

{"action":"change_size","amount":10}

Decrease:

{"action":"change_size","amount":-10}

==================================================
COMMAND 13: SET SIZE
==================================================

JSON:

{"action":"set_size","size":100}

The size is a percentage.

Example:

User:
set size to 50 percent

JSON:
{"action":"set_size","size":50}

==================================================
COMMAND 14: SHOW
==================================================

JSON:

{"action":"show"}

==================================================
COMMAND 15: HIDE
==================================================

JSON:

{"action":"hide"}

==================================================
COMMAND 16: WAIT
==================================================

JSON:

{"action":"wait","seconds":1}

Example:

User:
wait 5 seconds

JSON:
{"action":"wait","seconds":5}

==================================================
COMMAND 17: CUSTOM FUNCTION
==================================================

Custom functions may be available.

To call one:

{"action":"function","name":"FUNCTION_NAME","arguments":[]}

The function name MUST exactly match one of the available custom functions.

Arguments MUST be inside the "arguments" array.

Example with zero arguments:

{"action":"function","name":"jump","arguments":[]}

Example with one argument:

{"action":"function","name":"jump","arguments":[50]}

Example with two arguments:

{"action":"function","name":"moveTo","arguments":[100,50]}

==================================================
STRICT JSON RULES
==================================================

RULE 1:

The response must be valid JSON.

RULE 2:

The top-level value must be an object.

RULE 3:

The object must contain "action".

RULE 4:

"action" must be one of the valid actions.

RULE 5:

Do not invent actions.

RULE 6:

Do not use Scratch block names as action names.

BAD:

{"action":"next costume"}

GOOD:

{"action":"next_costume"}

RULE 7:

Do not respond with natural language.

BAD:

I will change the costume.

GOOD:

{"action":"next_costume"}

RULE 8:

Do not use Markdown.

BAD:

\`\`\`json
{"action":"next_costume"}
\`\`\`

GOOD:

{"action":"next_costume"}

RULE 9:

Return exactly ONE command.

RULE 10:

Never return multiple JSON objects.

RULE 11:

Never return a JSON array.

RULE 12:

Never include comments.

RULE 13:

Never include explanations.

RULE 14:

If the user asks for a command, execute the requested command using the correct JSON action.

RULE 15:

If the user says "next costume", ALWAYS return:

{"action":"next_costume"}

RULE 16:

If the user asks to call a custom function, return the function action.

==================================================
IMPORTANT
==================================================

You are not a conversational assistant in this mode.

You are a machine-readable command generator.

The extension will parse your JSON and execute it.

Therefore, output ONLY valid JSON.
`.trim();
        }

        setApiKey(args) {
            this.apiKey =
                String(args.KEY || "").trim();
        }

        setApiUrl(args) {
            this.apiUrl =
                String(args.URL || "").trim();
        }

        setModel(args) {
            this.model =
                String(args.MODEL || "").trim();
        }

        setSystemPrompt(args) {
            this.systemPrompt =
                String(args.PROMPT || "").trim();
        }

        aiResponse() {
            return this.lastResponse;
        }

        aiIsThinking() {
            return this.thinking;
        }

        lastError() {
            return this.lastError;
        }

        clearConversation() {
            this.history = [];
            this.lastResponse = "";
            this.lastError = "";
        }

        async askAI(args, util) {
            if (this.thinking) {
                return;
            }

            if (!this.apiKey) {
                this.lastError =
                    "No API key has been set.";

                this.lastResponse =
                    "AI error: " +
                    this.lastError;

                return;
            }

            const message =
                String(args.MESSAGE ?? "");

            if (util && util.target) {
                this.lastTarget =
                    util.target;
            }

            this.thinking = true;
            this.lastError = "";

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

                            body: JSON.stringify({
                                model:
                                    this.model,

                                messages:
                                    messages,

                                temperature:
                                    0,

                                response_format: {
                                    type:
                                        "json_object"
                                }
                            })
                        }
                    );

                const responseText =
                    await response.text();

                if (!response.ok) {
                    throw new Error(
                        "HTTP " +
                        response.status +
                        ": " +
                        responseText
                    );
                }

                let data;

                try {
                    data =
                        JSON.parse(
                            responseText
                        );
                } catch (error) {
                    throw new Error(
                        "The API returned invalid JSON."
                    );
                }

                const answer =
                    String(
                        data?.choices?.[0]?.message?.content ??
                        data?.choices?.[0]?.text ??
                        ""
                    ).trim();

                if (!answer) {
                    throw new Error(
                        "The AI returned an empty response."
                    );
                }

                const command =
                    this.parseCommand(
                        answer
                    );

                if (!command) {
                    throw new Error(
                        "The AI returned invalid JSON or an invalid command."
                    );
                }

                this.lastResponse =
                    JSON.stringify(
                        command
                    );

                this.history.push(
                    {
                        role: "user",
                        content: message
                    },

                    {
                        role: "assistant",
                        content:
                            JSON.stringify(
                                command
                            )
                    }
                );

                if (
                    this.history.length > 20
                ) {
                    this.history =
                        this.history.slice(
                            -20
                        );
                }

                await this.executeCommand(
                    command,
                    this.lastTarget
                );

            } catch (error) {
                this.lastError =
                    error?.message ||
                    String(error);

                this.lastResponse =
                    "AI error: " +
                    this.lastError;

            } finally {
                this.thinking = false;
            }
        }

        getCompleteSystemPrompt() {
            let prompt =
                this.systemPrompt;

            if (!prompt) {
                prompt =
                    this.getDefaultSystemPrompt();
            }

            /*
             * This is intentionally appended even if
             * the user used the "set AI system prompt"
             * block.
             *
             * Groq JSON mode requires the messages
             * to contain the word "json".
             */

            prompt += `

==================================================
MANDATORY JSON OUTPUT
==================================================

The response MUST be valid JSON.

The response MUST contain the word JSON in this
instruction context.

Return exactly ONE JSON object.

Do not return normal text.

Do not return Markdown.

Do not use code fences.

Do not return multiple objects.

Do not return an array.

Every response must contain an "action" property.

Only use valid actions from the command list.
`.trim();

            /*
             * Always append the complete command
             * list so custom system prompts cannot
             * accidentally remove the command knowledge.
             */

            prompt += `

==================================================
VALID ACTION REFERENCE
==================================================

The only valid actions are:

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

Examples:

{"action":"say","text":"Hello!"}

{"action":"move","steps":10}

{"action":"goto","x":100,"y":50}

{"action":"change_x","amount":10}

{"action":"change_y","amount":10}

{"action":"set_x","x":100}

{"action":"set_y","y":50}

{"action":"turn","degrees":15}

{"action":"set_direction","degrees":90}

{"action":"next_costume"}

{"action":"switch_costume","costume":"costume2"}

{"action":"change_size","amount":10}

{"action":"set_size","size":100}

{"action":"show"}

{"action":"hide"}

{"action":"wait","seconds":1}

Custom function:

{"action":"function","name":"FUNCTION_NAME","arguments":[]}
`.trim();

            if (
                this.customFunctions.length
            ) {
                prompt +=
                    "\n\n==================================================\n" +
                    "CUSTOM FUNCTIONS CURRENTLY AVAILABLE\n" +
                    "==================================================\n";

                for (
                    const func
                    of this.customFunctions
                ) {
                    prompt +=
                        "\nFunction: " +
                        func.name +
                        "\n";

                    prompt +=
                        "Arguments: " +
                        func.argumentCount +
                        "\n";

                    prompt +=
                        "Call format: " +
                        JSON.stringify({
                            action:
                                "function",

                            name:
                                func.name,

                            arguments:
                                Array(
                                    func.argumentCount
                                ).fill(
                                    "argument"
                                )
                        }) +
                        "\n";
                }

                prompt +=
                    "\nOnly these custom functions may be called.";
            } else {
                prompt +=
                    "\n\nThere are currently NO custom functions.";
            }

            return prompt;
        }

        parseCommand(text) {
            let cleaned =
                String(text || "")
                    .trim();

            cleaned =
                cleaned
                    .replace(
                        /^```json\s*/i,
                        ""
                    )
                    .replace(
                        /^```\s*/i,
                        ""
                    )
                    .replace(
                        /\s*```$/i,
                        ""
                    )
                    .trim();

            let parsed;

            try {
                parsed =
                    JSON.parse(cleaned);
            } catch (error) {
                const extracted =
                    this.extractJSONObject(
                        cleaned
                    );

                if (!extracted) {
                    return null;
                }

                try {
                    parsed =
                        JSON.parse(
                            extracted
                        );
                } catch (error2) {
                    return null;
                }
            }

            return this.normalizeCommand(
                parsed
            );
        }

        extractJSONObject(text) {
            const start =
                text.indexOf("{");

            if (start === -1) {
                return null;
            }

            let depth = 0;
            let inString = false;
            let escaped = false;

            for (
                let i = start;
                i < text.length;
                i++
            ) {
                const char =
                    text[i];

                if (inString) {
                    if (escaped) {
                        escaped = false;
                    } else if (
                        char === "\\"
                    ) {
                        escaped = true;
                    } else if (
                        char === '"'
                    ) {
                        inString = false;
                    }

                    continue;
                }

                if (
                    char === '"'
                ) {
                    inString = true;
                } else if (
                    char === "{"
                ) {
                    depth++;
                } else if (
                    char === "}"
                ) {
                    depth--;

                    if (depth === 0) {
                        return text.slice(
                            start,
                            i + 1
                        );
                    }
                }
            }

            return null;
        }

        normalizeCommand(command) {
            if (
                !command ||
                typeof command !==
                    "object" ||
                Array.isArray(command)
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
                !validActions.includes(
                    action
                )
            ) {
                return null;
            }

            switch (action) {
                case "say":
                    return {
                        action:
                            "say",

                        text:
                            String(
                                command.text ??
                                ""
                            )
                    };

                case "move":
                    return {
                        action:
                            "move",

                        steps:
                            this.number(
                                command.steps,
                                0
                            )
                    };

                case "goto":
                    return {
                        action:
                            "goto",

                        x:
                            this.number(
                                command.x,
                                0
                            ),

                        y:
                            this.number(
                                command.y,
                                0
                            )
                    };

                case "change_x":
                    return {
                        action:
                            "change_x",

                        amount:
                            this.number(
                                command.amount,
                                0
                            )
                    };

                case "change_y":
                    return {
                        action:
                            "change_y",

                        amount:
                            this.number(
                                command.amount,
                                0
                            )
                    };

                case "set_x":
                    return {
                        action:
                            "set_x",

                        x:
                            this.number(
                                command.x,
                                0
                            )
                    };

                case "set_y":
                    return {
                        action:
                            "set_y",

                        y:
                            this.number(
                                command.y,
                                0
                            )
                    };

                case "turn":
                    return {
                        action:
                            "turn",

                        degrees:
                            this.number(
                                command.degrees,
                                0
                            )
                    };

                case "set_direction":
                    return {
                        action:
                            "set_direction",

                        degrees:
                            this.number(
                                command.degrees,
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

                        amount:
                            this.number(
                                command.amount,
                                0
                            )
                    };

                case "set_size":
                    return {
                        action:
                            "set_size",

                        size:
                            this.number(
                                command.size,
                                100
                            )
                    };

                case "show":
                    return {
                        action:
                            "show"
                    };

                case "hide":
                    return {
                        action:
                            "hide"
                    };

                case "wait":
                    return {
                        action:
                            "wait",

                        seconds:
                            this.number(
                                command.seconds,
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
                                func.name
                                    .toLowerCase() ===
                                name.toLowerCase()
                        );

                    if (
                        !functionDefinition
                    ) {
                        return null;
                    }

                    const functionArguments =
                        Array.isArray(
                            command.arguments
                        )
                            ? command.arguments
                            : [];

                    /*
                     * Require the exact number of
                     * arguments defined by the function.
                     */

                    if (
                        functionArguments.length !==
                        functionDefinition.argumentCount
                    ) {
                        return null;
                    }

                    return {
                        action:
                            "function",

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

        createFunction(args) {
            const name =
                String(
                    args.NAME || ""
                ).trim();

            if (!name) {
                return;
            }

            let argumentCount =
                Math.floor(
                    this.number(
                        args.ARGUMENTS,
                        0
                    )
                );

            argumentCount =
                Math.max(
                    0,
                    Math.min(
                        100,
                        argumentCount
                    )
                );

            const existing =
                this.customFunctions.find(
                    func =>
                        func.name
                            .toLowerCase() ===
                        name.toLowerCase()
                );

            if (existing) {
                existing.name =
                    name;

                existing.argumentCount =
                    argumentCount;
            } else {
                this.customFunctions.push({
                    name:
                        name,

                    argumentCount:
                        argumentCount
                });
            }

            this.registerFunctionName(
                name
            );
        }

        deleteFunction(args) {
            const name =
                String(
                    args.NAME || ""
                ).trim();

            if (!name) {
                return;
            }

            this.customFunctions =
                this.customFunctions.filter(
                    func =>
                        func.name
                            .toLowerCase() !==
                        name.toLowerCase()
                );
        }

        functionExists(args) {
            const name =
                String(
                    args.NAME || ""
                )
                    .trim()
                    .toLowerCase();

            if (!name) {
                return false;
            }

            return this.customFunctions.some(
                func =>
                    func.name
                        .toLowerCase() ===
                    name
            );
        }

        functionList() {
            return this.customFunctions
                .map(
                    func =>
                        func.name
                )
                .join(", ");
        }

        registerFunctionName(name) {
            if (!name) {
                return;
            }
        }

        getFunctionNames() {
            if (
                !this.customFunctions.length
            ) {
                return [
                    {
                        text:
                            "create a function first",

                        value:
                            ""
                    }
                ];
            }

            return this.customFunctions.map(
                func => ({
                    text:
                        func.name,

                    value:
                        func.name
                })
            );
        }

        whenFunctionReceived(
            args
        ) {
            return false;
        }

        fireFunction(
            name,
            argumentsList
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
                        func.name
                            .toLowerCase() ===
                        name.toLowerCase()
                );

            if (
                !functionDefinition
            ) {
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

            if (
                !this.runtime ||
                typeof this.runtime.startHats !==
                    "function"
            ) {
                return;
            }

            const threads =
                this.runtime.startHats(
                    "aispritecontroller_whenFunctionReceived",
                    {
                        FUNCTION:
                            functionDefinition.name
                    }
                );

            for (
                const thread
                of threads || []
            ) {
                this.functionContexts.set(
                    thread,
                    context
                );
            }
        }

        getFunctionContext(util) {
            if (
                util &&
                util.thread
            ) {
                let thread =
                    util.thread;

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
            }

            return (
                this.lastFunctionContext ||
                null
            );
        }

        functionArgument(
            args,
            util
        ) {
            const context =
                this.getFunctionContext(
                    util
                );

            if (!context) {
                return "";
            }

            const index =
                Math.floor(
                    this.number(
                        args.INDEX,
                        1
                    )
                ) - 1;

            if (
                index < 0 ||
                index >=
                    context.arguments.length
            ) {
                return "";
            }

            return this.argumentToString(
                context.arguments[index]
            );
        }

        functionArgumentElse(
            args,
            util
        ) {
            const fallback =
                String(
                    args.FALLBACK ??
                    ""
                );

            const context =
                this.getFunctionContext(
                    util
                );

            if (!context) {
                return fallback;
            }

            const index =
                Math.floor(
                    this.number(
                        args.INDEX,
                        1
                    )
                ) - 1;

            if (
                index < 0 ||
                index >=
                    context.arguments.length
            ) {
                return fallback;
            }

            const value =
                context.arguments[index];

            if (
                value === null ||
                value === undefined
            ) {
                return fallback;
            }

            return this.argumentToString(
                value
            );
        }

        lastFunctionReceived() {
            return (
                this.lastFunctionName ||
                ""
            );
        }

        async executeCommand(
            command,
            target
        ) {
            if (!command) {
                return;
            }

            switch (
                command.action
            ) {
                case "say":
                    this.say(
                        target,
                        command.text
                    );
                    break;

                case "move":
                    this.move(
                        target,
                        command.steps
                    );
                    break;

                case "goto":
                    this.goTo(
                        target,
                        command.x,
                        command.y
                    );
                    break;

                case "change_x":
                    if (target) {
                        target.setXY(
                            target.x +
                                command.amount,

                            target.y
                        );
                    }
                    break;

                case "change_y":
                    if (target) {
                        target.setXY(
                            target.x,

                            target.y +
                                command.amount
                        );
                    }
                    break;

                case "set_x":
                    if (target) {
                        target.setXY(
                            command.x,

                            target.y
                        );
                    }
                    break;

                case "set_y":
                    if (target) {
                        target.setXY(
                            target.x,

                            command.y
                        );
                    }
                    break;

                case "turn":
                    if (target) {
                        target.setDirection(
                            target.direction +
                                command.degrees
                        );
                    }
                    break;

                case "set_direction":
                    if (target) {
                        target.setDirection(
                            command.degrees
                        );
                    }
                    break;

                case "next_costume":
                    this.nextCostume(
                        target
                    );
                    break;

                case "switch_costume":
                    this.switchCostume(
                        target,
                        command.costume
                    );
                    break;

                case "change_size":
                    if (
                        target &&
                        typeof target.setSize ===
                            "function"
                    ) {
                        target.setSize(
                            target.size +
                                command.amount
                        );
                    }
                    break;

                case "set_size":
                    if (
                        target &&
                        typeof target.setSize ===
                            "function"
                    ) {
                        target.setSize(
                            command.size
                        );
                    }
                    break;

                case "show":
                    if (target) {
                        target.visible =
                            true;
                    }
                    break;

                case "hide":
                    if (target) {
                        target.visible =
                            false;
                    }
                    break;

                case "wait":
                    await this.delay(
                        Math.max(
                            0,
                            command.seconds
                        ) * 1000
                    );
                    break;

                case "function":
                    this.fireFunction(
                        command.name,
                        command.arguments
                    );
                    break;
            }
        }

        say(
            target,
            text
        ) {
            if (!target) {
                return;
            }

            const value =
                String(
                    text ?? ""
                );

            if (
                typeof target.setSay ===
                    "function"
            ) {
                target.setSay(
                    value
                );
            } else if (
                typeof target.say ===
                    "function"
            ) {
                target.say(
                    value
                );
            }
        }

        move(
            target,
            steps
        ) {
            if (!target) {
                return;
            }

            const direction =
                (
                    target.direction -
                    90
                ) *
                Math.PI /
                180;

            target.setXY(
                target.x +
                    steps *
                    Math.cos(
                        direction
                    ),

                target.y +
                    steps *
                    Math.sin(
                        direction
                    )
            );
        }

        goTo(
            target,
            x,
            y
        ) {
            if (!target) {
                return;
            }

            target.setXY(
                x,
                y
            );
        }

        changeX(
            args,
            util
        ) {
            if (
                !util?.target
            ) {
                return;
            }

            util.target.setXY(
                util.target.x +
                    this.number(
                        args.VALUE,
                        0
                    ),

                util.target.y
            );
        }

        changeY(
            args,
            util
        ) {
            if (
                !util?.target
            ) {
                return;
            }

            util.target.setXY(
                util.target.x,

                util.target.y +
                    this.number(
                        args.VALUE,
                        0
                    )
            );
        }

        setX(
            args,
            util
        ) {
            if (
                !util?.target
            ) {
                return;
            }

            util.target.setXY(
                this.number(
                    args.X,
                    util.target.x
                ),

                util.target.y
            );
        }

        setY(
            args,
            util
        ) {
            if (
                !util?.target
            ) {
                return;
            }

            util.target.setXY(
                util.target.x,

                this.number(
                    args.Y,
                    util.target.y
                )
            );
        }

        turn(
            args,
            util
        ) {
            if (
                !util?.target
            ) {
                return;
            }

            util.target.setDirection(
                util.target.direction +
                    this.number(
                        args.DEGREES,
                        0
                    )
            );
        }

        pointDirection(
            args,
            util
        ) {
            if (
                !util?.target
            ) {
                return;
            }

            util.target.setDirection(
                this.number(
                    args.DIRECTION,
                    90
                )
            );
        }

        nextCostume(
            target
        ) {
            if (!target) {
                return;
            }

            const costumes =
                target.sprite?.costumes ||
                [];

            if (
                !costumes.length
            ) {
                return;
            }

            if (
                typeof target.setCostume ===
                    "function"
            ) {
                const current =
                    Number.isFinite(
                        target.currentCostume
                    )
                        ? target.currentCostume
                        : 0;

                target.setCostume(
                    (
                        current +
                        1
                    ) %
                        costumes.length
                );
            }
        }

        switchCostume(
            target,
            costume
        ) {
            if (!target) {
                return;
            }

            const costumes =
                target.sprite?.costumes ||
                [];

            const requested =
                String(
                    costume ?? ""
                ).trim();

            let index = -1;

            if (
                /^-?\d+$/.test(
                    requested
                )
            ) {
                index =
                    Number(
                        requested
                    ) - 1;
            } else {
                index =
                    costumes.findIndex(
                        item =>
                            String(
                                item.name ||
                                ""
                            ).toLowerCase() ===
                            requested.toLowerCase()
                    );
            }

            if (
                index >= 0 &&
                index <
                    costumes.length &&
                typeof target.setCostume ===
                    "function"
            ) {
                target.setCostume(
                    index
                );
            }
        }

        changeSize(
            args,
            util
        ) {
            if (
                !util?.target ||
                typeof util.target.setSize !==
                    "function"
            ) {
                return;
            }

            util.target.setSize(
                util.target.size +
                    this.number(
                        args.SIZE,
                        0
                    )
            );
        }

        setSize(
            args,
            util
        ) {
            if (
                !util?.target ||
                typeof util.target.setSize !==
                    "function"
            ) {
                return;
            }

            util.target.setSize(
                this.number(
                    args.SIZE,
                    100
                )
            );
        }

        show(
            args,
            util
        ) {
            if (
                util?.target
            ) {
                util.target.visible =
                    true;
            }
        }

        hide(
            args,
            util
        ) {
            if (
                util?.target
            ) {
                util.target.visible =
                    false;
            }
        }

        async wait(
            args
        ) {
            await this.delay(
                Math.max(
                    0,
                    this.number(
                        args.SECONDS,
                        0
                    )
                ) * 1000
            );
        }

        argumentToString(
            value
        ) {
            if (
                typeof value ===
                    "string" ||
                typeof value ===
                    "number" ||
                typeof value ===
                    "boolean"
            ) {
                return String(
                    value
                );
            }

            try {
                return JSON.stringify(
                    value
                );
            } catch (error) {
                return String(
                    value
                );
            }
        }

        number(
            value,
            fallback
        ) {
            const number =
                Number(value);

            return Number.isFinite(
                number
            )
                ? number
                : fallback;
        }

        delay(ms) {
            return new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        ms
                    )
            );
        }
    }

    Scratch.extensions.register(
        new AISpriteController()
    );

})(Scratch);
