(function (Scratch) {
    "use strict";

    if (!Scratch.extensions.unsandboxed) {
        throw new Error("AI Sprite Controller must run unsandboxed.");
    }

    class AISpriteController {
        constructor() {
            this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";
            this.apiKey = "";
            this.model = "llama-3.3-70b-versatile";

            this.systemPrompt = this.getDefaultSystemPrompt();

            this.lastResponse = "";
            this.lastError = "";
            this.thinking = false;

            this.history = [];

            this.lastTarget = null;

            this.functionNames = [];
            this.lastFunctionName = "";
            this.lastFunctionArguments = [];

            this.functionContexts = new WeakMap();
            this.lastFunctionContext = null;
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
                                    "Say hello."
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
                        opcode: "whenFunctionReceived",
                        blockType: Scratch.BlockType.HAT,
                        text: "when function received [FUNCTION]",
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
                        text: "function argument [INDEX]",
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
                        text: "function argument [INDEX] else [FALLBACK]",
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
                        text: "last function received"
                    },

                    {
                        opcode: "say",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "AI sprite say [TEXT]",
                        arguments: {
                            TEXT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "Hello!"
                            }
                        }
                    },

                    {
                        opcode: "move",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "AI sprite move [STEPS] steps",
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
                        text: "AI sprite go to x: [X] y: [Y]",
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
                        text: "AI sprite change x by [VALUE]",
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
                        text: "AI sprite change y by [VALUE]",
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
                        text: "AI sprite set x to [X]",
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
                        text: "AI sprite set y to [Y]",
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
                        text: "AI sprite turn [DEGREES] degrees",
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
                        text: "AI sprite point in direction [DIRECTION]",
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
                        text: "AI sprite next costume"
                    },

                    {
                        opcode: "switchCostume",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "AI sprite switch costume to [COSTUME]",
                        arguments: {
                            COSTUME: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: "costume1"
                            }
                        }
                    },

                    {
                        opcode: "changeSize",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "AI sprite change size by [SIZE]",
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
                        text: "AI sprite set size to [SIZE] %",
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
                        text: "AI sprite show"
                    },

                    {
                        opcode: "hide",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "AI sprite hide"
                    },

                    {
                        opcode: "wait",
                        blockType: Scratch.BlockType.COMMAND,
                        text: "AI sprite wait [SECONDS] seconds",
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
You control a Scratch/Gandi sprite through JSON commands.

IMPORTANT:
Return ONLY one valid JSON object.
Do not use Markdown.
Do not use code fences.
Do not explain the JSON.

VALID COMMANDS:

Say:
{"action":"say","text":"Hello!"}

Move:
{"action":"move","steps":10}

Go to:
{"action":"goto","x":100,"y":50}

Change X:
{"action":"change_x","amount":10}

Change Y:
{"action":"change_y","amount":10}

Set X:
{"action":"set_x","x":100}

Set Y:
{"action":"set_y","y":50}

Turn:
{"action":"turn","degrees":15}

Point in direction:
{"action":"set_direction","degrees":90}

Next costume:
{"action":"next_costume"}

Switch costume:
{"action":"switch_costume","costume":"costume2"}

Change size:
{"action":"change_size","amount":10}

Set size:
{"action":"set_size","size":100}

Show:
{"action":"show"}

Hide:
{"action":"hide"}

Wait:
{"action":"wait","seconds":1}

CUSTOM FUNCTIONS:

You can trigger a custom Gandi function with:

{"action":"function","name":"FUNCTION_NAME","arguments":[]}

With arguments:

{"action":"function","name":"jump","arguments":[50]}

Multiple arguments:

{"action":"function","name":"dance","arguments":["fast",10]}

Arguments are ordered and numbered starting at 1.

The first argument is function argument 1.
The second argument is function argument 2.
The third argument is function argument 3.

Examples:

User: jump 50
{"action":"function","name":"jump","arguments":[50]}

User: dance fast 10 times
{"action":"function","name":"dance","arguments":["fast",10]}

User: make the sprite happy
{"action":"function","name":"happy","arguments":[]}

Always choose the appropriate command.
`.trim();
        }

        setApiKey(args) {
            this.apiKey = String(args.KEY || "").trim();
        }

        setApiUrl(args) {
            this.apiUrl = String(args.URL || "").trim();
        }

        setModel(args) {
            this.model = String(args.MODEL || "").trim();
        }

        setSystemPrompt(args) {
            this.systemPrompt = String(args.PROMPT || "");
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

        lastFunctionReceived() {
            return this.lastFunctionName;
        }

        clearConversation() {
            this.history = [];
            this.lastResponse = "";
            this.lastError = "";
            this.lastFunctionName = "";
            this.lastFunctionArguments = [];
            this.lastFunctionContext = null;
        }

        async askAI(args, util) {
            if (this.thinking) {
                return;
            }

            if (!this.apiKey) {
                this.lastError = "No API key has been set.";
                this.lastResponse =
                    "Error: " + this.lastError;
                return;
            }

            const message =
                String(args.MESSAGE ?? "");

            if (util && util.target) {
                this.lastTarget = util.target;
            }

            this.thinking = true;
            this.lastError = "";

            try {
                const messages = [
                    {
                        role: "system",
                        content: this.systemPrompt
                    },
                    ...this.history,
                    {
                        role: "user",
                        content: message
                    }
                ];

                const response = await Scratch.fetch(
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
                            model: this.model,
                            messages: messages,
                            temperature: 0.2
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
                    data = JSON.parse(
                        responseText
                    );
                } catch (error) {
                    throw new Error(
                        "The API returned invalid JSON."
                    );
                }

                const answer =
                    String(
                        data?.choices?.[0]?.message
                            ?.content ??
                        data?.choices?.[0]?.text ??
                        ""
                    ).trim();

                if (!answer) {
                    throw new Error(
                        "The AI returned an empty response."
                    );
                }

                this.lastResponse = answer;

                this.history.push(
                    {
                        role: "user",
                        content: message
                    },
                    {
                        role: "assistant",
                        content: answer
                    }
                );

                if (this.history.length > 20) {
                    this.history =
                        this.history.slice(-20);
                }

                const command =
                    this.parseCommand(answer);

                if (command) {
                    await this.executeCommand(
                        command,
                        this.lastTarget
                    );
                }
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

        parseCommand(text) {
            let cleaned =
                String(text || "").trim();

            cleaned = cleaned
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

            try {
                const command =
                    JSON.parse(cleaned);

                return this.normalizeCommand(
                    command
                );
            } catch (error) {
            }

            const extracted =
                this.extractJSONObject(
                    cleaned
                );

            if (!extracted) {
                return null;
            }

            try {
                return this.normalizeCommand(
                    JSON.parse(extracted)
                );
            } catch (error) {
                return null;
            }
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
                const char = text[i];

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

                if (char === '"') {
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
                typeof command !== "object"
            ) {
                return null;
            }

            const action =
                String(
                    command.action || ""
                ).trim();

            if (!action) {
                return null;
            }

            if (action === "function") {
                const name =
                    String(
                        command.name ??
                        command.function ??
                        ""
                    ).trim();

                const argumentsList =
                    Array.isArray(
                        command.arguments
                    )
                        ? command.arguments
                        : [];

                if (!name) {
                    return null;
                }

                this.registerFunction(
                    name
                );

                return {
                    action: "function",
                    name: name,
                    arguments:
                        argumentsList
                };
            }

            return {
                ...command,
                action: action
            };
        }

        registerFunction(name) {
            name =
                String(name || "").trim();

            if (
                name &&
                !this.functionNames.includes(
                    name
                )
            ) {
                this.functionNames.push(
                    name
                );
            }
        }

        getFunctionNames() {
            if (
                !this.functionNames.length
            ) {
                return [
                    {
                        text: "function",
                        value: "function"
                    }
                ];
            }

            return this.functionNames.map(
                name => ({
                    text: name,
                    value: name
                })
            );
        }

        async executeCommand(
            command,
            target
        ) {
            if (!command) {
                return;
            }

            switch (command.action) {

                case "say":
                    this.say(
                        target,
                        command.text
                    );
                    break;

                case "move":
                    this.move(
                        target,
                        this.number(
                            command.steps,
                            0
                        )
                    );
                    break;

                case "goto":
                    this.goTo(
                        target,
                        this.number(
                            command.x,
                            target
                                ? target.x
                                : 0
                        ),
                        this.number(
                            command.y,
                            target
                                ? target.y
                                : 0
                        )
                    );
                    break;

                case "change_x":
                    if (target) {
                        target.setXY(
                            target.x +
                                this.number(
                                    command.amount,
                                    0
                                ),
                            target.y
                        );
                    }
                    break;

                case "change_y":
                    if (target) {
                        target.setXY(
                            target.x,
                            target.y +
                                this.number(
                                    command.amount,
                                    0
                                )
                        );
                    }
                    break;

                case "set_x":
                    if (target) {
                        target.setXY(
                            this.number(
                                command.x,
                                target.x
                            ),
                            target.y
                        );
                    }
                    break;

                case "set_y":
                    if (target) {
                        target.setXY(
                            target.x,
                            this.number(
                                command.y,
                                target.y
                            )
                        );
                    }
                    break;

                case "turn":
                    if (target) {
                        target.setDirection(
                            target.direction +
                                this.number(
                                    command.degrees,
                                    0
                                )
                        );
                    }
                    break;

                case "set_direction":
                    if (target) {
                        target.setDirection(
                            this.number(
                                command.degrees,
                                target.direction
                            )
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
                                this.number(
                                    command.amount,
                                    0
                                )
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
                            this.number(
                                command.size,
                                target.size
                            )
                        );
                    }
                    break;

                case "show":
                    if (target) {
                        target.visible = true;
                    }
                    break;

                case "hide":
                    if (target) {
                        target.visible = false;
                    }
                    break;

                case "wait":
                    await this.delay(
                        Math.max(
                            0,
                            this.number(
                                command.seconds,
                                0
                            )
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

        say(target, text) {
            if (!target) {
                return;
            }

            const value =
                String(text ?? "");

            if (
                typeof target.setSay ===
                "function"
            ) {
                target.setSay(value);
            } else if (
                typeof target.say ===
                "function"
            ) {
                target.say(value);
            }
        }

        move(target, steps) {
            if (!target) {
                return;
            }

            const direction =
                (target.direction - 90) *
                Math.PI /
                180;

            target.setXY(
                target.x +
                    steps *
                    Math.cos(direction),

                target.y +
                    steps *
                    Math.sin(direction)
            );
        }

        goTo(target, x, y) {
            if (!target) {
                return;
            }

            target.setXY(x, y);
        }

        nextCostume(target) {
            if (!target) {
                return;
            }

            const costumes =
                target.sprite?.costumes ||
                [];

            if (!costumes.length) {
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
                    (current + 1) %
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
                    Number(requested) - 1;
            } else {
                index =
                    costumes.findIndex(
                        item =>
                            String(
                                item.name || ""
                            ).toLowerCase() ===
                            requested.toLowerCase()
                    );
            }

            if (
                index >= 0 &&
                index < costumes.length &&
                typeof target.setCostume ===
                    "function"
            ) {
                target.setCostume(index);
            }
        }

        fireFunction(
            name,
            argumentsList
        ) {
            name =
                String(name || "").trim();

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

            this.registerFunction(name);

            this.lastFunctionName =
                name;

            this.lastFunctionArguments =
                argumentsList.slice();

            const context = {
                name: name,
                arguments:
                    argumentsList.slice()
            };

            this.lastFunctionContext =
                context;

            const threads =
                this.runtime.startHats(
                    "aispritecontroller_whenFunctionReceived",
                    {
                        FUNCTION: name
                    }
                );

            for (
                const thread of
                    threads || []
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
                    args.FALLBACK ?? ""
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

        argumentToString(value) {
            if (
                typeof value ===
                    "string" ||
                typeof value ===
                    "number" ||
                typeof value ===
                    "boolean"
            ) {
                return String(value);
            }

            try {
                return JSON.stringify(
                    value
                );
            } catch (error) {
                return String(value);
            }
        }

        number(value, fallback) {
            const n = Number(value);

            return Number.isFinite(n)
                ? n
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
