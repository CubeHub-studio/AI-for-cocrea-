(function (Scratch) {
    "use strict";

    if (!Scratch.extensions.unsandboxed) {
        throw new Error(
            "AI Sprite Controller must run unsandboxed."
        );
    }

    class AISpriteController {
        constructor() {
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

            /*
             * Custom functions created by the user.
             *
             * {
             *     name: "jump",
             *     argumentCount: 2
             * }
             */
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

                color1: "#10b981",
                color2: "#059669",
                color3: "#047857",

                blocks: [

                    // =========================
                    // AI SETTINGS
                    // =========================

                    {
                        opcode: "setApiKey",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "set API key to [KEY]",
                        arguments: {
                            KEY: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "gsk_..."
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
                                    "Say hello."
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
                        opcode: "aiIsThinking",
                        blockType:
                            Scratch.BlockType.BOOLEAN,
                        text:
                            "AI is thinking?"
                    },

                    {
                        opcode: "lastError",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "AI error"
                    },

                    {
                        opcode:
                            "clearConversation",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "clear AI conversation"
                    },

                    // =========================
                    // CUSTOM FUNCTIONS
                    // =========================

                    {
                        opcode:
                            "createFunction",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "create function [NAME] with [ARGUMENTS] arguments",
                        arguments: {
                            NAME: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "jump"
                            },

                            ARGUMENTS: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    0
                            }
                        }
                    },

                    {
                        opcode:
                            "deleteFunction",
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
                        opcode:
                            "functionExists",
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
                        opcode:
                            "functionList",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "custom function list"
                    },

                    {
                        opcode:
                            "whenFunctionReceived",
                        blockType:
                            Scratch.BlockType.HAT,
                        text:
                            "when function received [FUNCTION]",
                        isEdgeActivated: false,
                        shouldRestartExistingThreads:
                            true,
                        arguments: {
                            FUNCTION: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                menu:
                                    "functionMenu"
                            }
                        }
                    },

                    {
                        opcode:
                            "functionArgument",
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
                        opcode:
                            "functionArgumentElse",
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
                        opcode:
                            "lastFunctionReceived",
                        blockType:
                            Scratch.BlockType.REPORTER,
                        text:
                            "last function received"
                    },

                    // =========================
                    // SPRITE COMMANDS
                    // =========================

                    {
                        opcode: "say",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite say [TEXT]",
                        arguments: {
                            TEXT: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "Hello!"
                            }
                        }
                    },

                    {
                        opcode: "move",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite move [STEPS] steps",
                        arguments: {
                            STEPS: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    10
                            }
                        }
                    },

                    {
                        opcode: "goTo",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite go to x: [X] y: [Y]",
                        arguments: {
                            X: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    0
                            },

                            Y: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    0
                            }
                        }
                    },

                    {
                        opcode: "changeX",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite change x by [VALUE]",
                        arguments: {
                            VALUE: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    10
                            }
                        }
                    },

                    {
                        opcode: "changeY",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite change y by [VALUE]",
                        arguments: {
                            VALUE: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    10
                            }
                        }
                    },

                    {
                        opcode: "setX",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite set x to [X]",
                        arguments: {
                            X: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    0
                            }
                        }
                    },

                    {
                        opcode: "setY",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite set y to [Y]",
                        arguments: {
                            Y: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    0
                            }
                        }
                    },

                    {
                        opcode: "turn",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite turn [DEGREES] degrees",
                        arguments: {
                            DEGREES: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    15
                            }
                        }
                    },

                    {
                        opcode:
                            "pointDirection",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite point in direction [DIRECTION]",
                        arguments: {
                            DIRECTION: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    90
                            }
                        }
                    },

                    {
                        opcode:
                            "nextCostume",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite next costume"
                    },

                    {
                        opcode:
                            "switchCostume",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite switch costume to [COSTUME]",
                        arguments: {
                            COSTUME: {
                                type:
                                    Scratch.ArgumentType.STRING,
                                defaultValue:
                                    "costume1"
                            }
                        }
                    },

                    {
                        opcode:
                            "changeSize",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite change size by [SIZE]",
                        arguments: {
                            SIZE: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    10
                            }
                        }
                    },

                    {
                        opcode:
                            "setSize",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite set size to [SIZE] %",
                        arguments: {
                            SIZE: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    100
                            }
                        }
                    },

                    {
                        opcode:
                            "show",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite show"
                    },

                    {
                        opcode:
                            "hide",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite hide"
                    },

                    {
                        opcode:
                            "wait",
                        blockType:
                            Scratch.BlockType.COMMAND,
                        text:
                            "AI sprite wait [SECONDS] seconds",
                        arguments: {
                            SECONDS: {
                                type:
                                    Scratch.ArgumentType.NUMBER,
                                defaultValue:
                                    1
                            }
                        }
                    }
                ],

                menus: {
                    functionMenu: {
                        acceptReporters: true,
                        items:
                            "getFunctionNames"
                    }
                }
            };
        }

        // =====================================================
        // DEFAULT AI PROMPT
        // =====================================================

        getDefaultSystemPrompt() {
            return `
You control a Scratch/Gandi sprite.

Return ONLY ONE valid JSON object.
Never use Markdown.
Never use code fences.
Never explain the JSON.

VALID SPRITE COMMANDS:

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

CUSTOM FUNCTIONS:

The project can create custom functions.

To call a custom function, use:

{"action":"function","name":"FUNCTION_NAME","arguments":[]}

Example:

{"action":"function","name":"jump","arguments":[]}

With one argument:

{"action":"function","name":"jump","arguments":[50]}

With multiple arguments:

{"action":"function","name":"moveTo","arguments":[100,50]}

Arguments are numbered starting at 1.

The first argument is function argument 1.
The second argument is function argument 2.
The third argument is function argument 3.

Always use the exact function name.

If the user asks to call a custom function, use action=function.
`.trim();
        }

        // =====================================================
        // AI SETTINGS
        // =====================================================

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
                String(args.PROMPT || "");
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

        // =====================================================
        // ASK AI
        // =====================================================

        async askAI(args, util) {
            if (this.thinking) {
                return;
            }

            if (!this.apiKey) {
                this.lastError =
                    "No API key has been set.";

                this.lastResponse =
                    "Error: " +
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
                    await Scratch.fetch(
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
                                    0.2
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
                        data?.choices?.[0]
                            ?.message
                            ?.content ??
                        data?.choices?.[0]
                            ?.text ??
                        ""
                    ).trim();

                if (!answer) {
                    throw new Error(
                        "The AI returned an empty response."
                    );
                }

                this.lastResponse =
                    answer;

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

                if (
                    this.history.length >
                    20
                ) {
                    this.history =
                        this.history.slice(
                            -20
                        );
                }

                const command =
                    this.parseCommand(
                        answer
                    );

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

        getCompleteSystemPrompt() {
            let prompt =
                this.systemPrompt;

            if (!prompt) {
                prompt =
                    this.getDefaultSystemPrompt();
            }

            if (
                this.customFunctions.length
            ) {
                prompt +=
                    "\n\nCUSTOM FUNCTIONS CURRENTLY AVAILABLE:\n";

                for (
                    const func of
                        this.customFunctions
                ) {
                    prompt +=
                        "- " +
                        func.name +
                        "(";

                    for (
                        let i = 1;
                        i <=
                            func.argumentCount;
                        i++
                    ) {
                        if (i > 1) {
                            prompt += ", ";
                        }

                        prompt +=
                            "argument" +
                            i;
                    }

                    prompt += ")\n";
                }

                prompt +=
                    "\nWhen calling one of these functions, use the exact name and put arguments in the correct order.\n";
            }

            return prompt;
        }

        // =====================================================
        // COMMAND PARSING
        // =====================================================

        parseCommand(text) {
            let cleaned =
                String(text || "").trim();

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

            try {
                return this.normalizeCommand(
                    JSON.parse(cleaned)
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
                typeof command !==
                    "object"
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

            if (
                action ===
                "function"
            ) {
                const name =
                    String(
                        command.name ??
                        command.function ??
                        ""
                    ).trim();

                const args =
                    Array.isArray(
                        command.arguments
                    )
                        ? command.arguments
                        : [];

                if (!name) {
                    return null;
                }

                return {
                    action:
                        "function",

                    name:
                        name,

                    arguments:
                        args
                };
            }

            return {
                ...command,
                action:
                    action
            };
        }

        // =====================================================
        // CUSTOM FUNCTION CREATION
        // =====================================================

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

            /*
             * Make sure the function
             * can immediately appear
             * in the function dropdown.
             */
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
                ).trim()
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

            /*
             * Scratch menus are generated
             * from the custom function list,
             * so no separate permanent list
             * is required.
             */
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

        // =====================================================
        // FUNCTION EVENTS
        // =====================================================

        whenFunctionReceived(
            args
        ) {
            /*
             * The actual event is started
             * with runtime.startHats().
             *
             * This method exists so the
             * block is a valid Scratch hat.
             */
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

            /*
             * A function must be created
             * before it can be called.
             */
            const functionDefinition =
                this.customFunctions.find(
                    func =>
                        func.name
                            .toLowerCase() ===
                        name.toLowerCase()
                );

            if (!functionDefinition) {
                /*
                 * Allow the AI to discover/
                 * register a function if it
                 * wasn't manually created.
                 */
                this.customFunctions.push({
                    name:
                        name,

                    argumentCount:
                        argumentsList.length
                });
            }

            this.lastFunctionName =
                name;

            this.lastFunctionArguments =
                argumentsList.slice();

            const context = {
                name:
                    name,

                arguments:
                    argumentsList.slice()
            };

            this.lastFunctionContext =
                context;

            /*
             * Scratch/Gandi event hat.
             *
             * The opcode MUST match the
             * extension id + hat opcode.
             */
            const threads =
                this.runtime.startHats(
                    "aispritecontroller_whenFunctionReceived",
                    {
                        FUNCTION:
                            name
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

        // =====================================================
        // EXECUTE AI COMMAND
        // =====================================================

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

        // =====================================================
        // SPRITE COMMANDS
        // =====================================================

        say(target, text) {
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

        goTo(target, x, y) {
            if (!target) {
                return;
            }

            target.setXY(
                x,
                y
            );
        }

        changeX(args, util) {
            if (!util?.target) {
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

        changeY(args, util) {
            if (!util?.target) {
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

        setX(args, util) {
            if (!util?.target) {
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

        setY(args, util) {
            if (!util?.target) {
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

        turn(args, util) {
            if (!util?.target) {
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
            if (!util?.target) {
                return;
            }

            util.target.setDirection(
                this.number(
                    args.DIRECTION,
                    90
                )
            );
        }

        nextCostume(target) {
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
                index < costumes.length &&
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

        show(args, util) {
            if (util?.target) {
                util.target.visible =
                    true;
            }
        }

        hide(args, util) {
            if (util?.target) {
                util.target.visible =
                    false;
            }
        }

        async wait(args) {
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

        // =====================================================
        // HELPERS
        // =====================================================

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
