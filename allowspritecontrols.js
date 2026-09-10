(function (Scratch) {
    "use strict";

    const {
        BlockType,
        ArgumentType,
        TargetType
    } = Scratch;

    class AISpriteController {
        constructor(runtime) {
            this.runtime = runtime;

            // Groq defaults
            this.apiKey = "";
            this.apiUrl =
                "https://api.groq.com/openai/v1/chat/completions";
            this.model = "openai/gpt-oss-20b";

            this.systemPrompt =
                "You are an AI controlling a sprite in a Gandi/Scratch-compatible game. " +
                "You must choose actions only from the VALID ACTIONS list provided to you. " +
                "Return EXACTLY ONE valid JSON object and nothing else. " +
                "Never use Markdown. Never invent an action. " +
                "Use the sprite state and available costumes to make your decision.";

            this.lastResponse = "";
            this.lastAction = "";
            this.lastError = "";

            this.enabled = true;
            this._thinking = false;
            this._requestId = 0;

            this.maxMove = 20;
            this.maxTurn = 45;

            this._lastState = {};
        }

        getInfo() {
            return {
                id: "aiSpriteController",
                name: "AI Sprite Controller",

                color1: "#7C3AED",
                color2: "#5B21B6",
                color3: "#4C1D95",

                blocks: [

                    "---- AI SETTINGS ----",

                    {
                        opcode: "setApiKey",
                        blockType: BlockType.COMMAND,
                        text: "set AI API key to [KEY]",
                        arguments: {
                            KEY: {
                                type: ArgumentType.STRING,
                                defaultValue: ""
                            }
                        }
                    },

                    {
                        opcode: "setApiUrl",
                        blockType: BlockType.COMMAND,
                        text: "set AI API URL to [URL]",
                        arguments: {
                            URL: {
                                type: ArgumentType.STRING,
                                defaultValue:
                                    "https://api.groq.com/openai/v1/chat/completions"
                            }
                        }
                    },

                    {
                        opcode: "setModel",
                        blockType: BlockType.COMMAND,
                        text: "set AI model to [MODEL]",
                        arguments: {
                            MODEL: {
                                type: ArgumentType.STRING,
                                defaultValue:
                                    "openai/gpt-oss-20b"
                            }
                        }
                    },

                    {
                        opcode: "setSystemPrompt",
                        blockType: BlockType.COMMAND,
                        text: "set AI instructions to [PROMPT]",
                        arguments: {
                            PROMPT: {
                                type: ArgumentType.STRING,
                                defaultValue:
                                    "Control the sprite intelligently."
                            }
                        }
                    },

                    {
                        opcode: "setMaxMove",
                        blockType: BlockType.COMMAND,
                        text: "set maximum AI movement to [AMOUNT]",
                        arguments: {
                            AMOUNT: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 20
                            }
                        }
                    },

                    {
                        opcode: "setMaxTurn",
                        blockType: BlockType.COMMAND,
                        text: "set maximum AI turn to [DEGREES]",
                        arguments: {
                            DEGREES: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 45
                            }
                        }
                    },

                    {
                        opcode: "enableAI",
                        blockType: BlockType.COMMAND,
                        text: "enable AI control"
                    },

                    {
                        opcode: "disableAI",
                        blockType: BlockType.COMMAND,
                        text: "disable AI control"
                    },

                    "---- AI CONTROL ----",

                    {
                        opcode: "askAI",
                        blockType: BlockType.COMMAND,
                        text: "ask AI to control this sprite"
                    },

                    {
                        opcode: "askAIAbout",
                        blockType: BlockType.COMMAND,
                        text: "ask AI to [GOAL]",
                        arguments: {
                            GOAL: {
                                type: ArgumentType.STRING,
                                defaultValue:
                                    "decide what to do"
                            }
                        }
                    },

                    {
                        opcode: "askAIWithState",
                        blockType: BlockType.COMMAND,
                        text: "ask AI with state [STATE]",
                        arguments: {
                            STATE: {
                                type: ArgumentType.STRING,
                                defaultValue: "{}"
                            }
                        }
                    },

                    {
                        opcode: "stopAI",
                        blockType: BlockType.COMMAND,
                        text: "stop AI"
                    },

                    "---- SPRITE STATE ----",

                    {
                        opcode: "spriteState",
                        blockType: BlockType.REPORTER,
                        text: "AI sprite state"
                    },

                    {
                        opcode: "spriteX",
                        blockType: BlockType.REPORTER,
                        text: "AI sprite X"
                    },

                    {
                        opcode: "spriteY",
                        blockType: BlockType.REPORTER,
                        text: "AI sprite Y"
                    },

                    {
                        opcode: "spriteDirection",
                        blockType: BlockType.REPORTER,
                        text: "AI sprite direction"
                    },

                    {
                        opcode: "spriteSize",
                        blockType: BlockType.REPORTER,
                        text: "AI sprite size"
                    },

                    {
                        opcode: "spriteVisible",
                        blockType: BlockType.BOOLEAN,
                        text: "AI sprite visible?"
                    },

                    {
                        opcode: "costumeList",
                        blockType: BlockType.REPORTER,
                        text: "AI costume list"
                    },

                    {
                        opcode: "currentCostume",
                        blockType: BlockType.REPORTER,
                        text: "AI current costume"
                    },

                    "---- AI RESULTS ----",

                    {
                        opcode: "lastAIResponse",
                        blockType: BlockType.REPORTER,
                        text: "AI response"
                    },

                    {
                        opcode: "lastAIAction",
                        blockType: BlockType.REPORTER,
                        text: "AI action JSON"
                    },

                    {
                        opcode: "lastAIError",
                        blockType: BlockType.REPORTER,
                        text: "AI error"
                    },

                    {
                        opcode: "aiThinking",
                        blockType: BlockType.BOOLEAN,
                        text: "AI is thinking?"
                    },

                    {
                        opcode: "aiEnabled",
                        blockType: BlockType.BOOLEAN,
                        text: "AI enabled?"
                    },

                    "---- DIRECT SPRITE ACTIONS ----",

                    {
                        opcode: "aiMove",
                        blockType: BlockType.COMMAND,
                        text: "AI move [AMOUNT] steps",
                        arguments: {
                            AMOUNT: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        },
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiTurn",
                        blockType: BlockType.COMMAND,
                        text: "AI turn [DEGREES] degrees",
                        arguments: {
                            DEGREES: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 15
                            }
                        },
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiPoint",
                        blockType: BlockType.COMMAND,
                        text: "AI point in direction [DIRECTION]",
                        arguments: {
                            DIRECTION: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 90
                            }
                        },
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiGoTo",
                        blockType: BlockType.COMMAND,
                        text: "AI go to x [X] y [Y]",
                        arguments: {
                            X: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 0
                            },
                            Y: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 0
                            }
                        },
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiChangeX",
                        blockType: BlockType.COMMAND,
                        text: "AI change X by [AMOUNT]",
                        arguments: {
                            AMOUNT: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        },
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiChangeY",
                        blockType: BlockType.COMMAND,
                        text: "AI change Y by [AMOUNT]",
                        arguments: {
                            AMOUNT: {
                                type: ArgumentType.NUMBER,
                                defaultValue: 10
                            }
                        },
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiNextCostume",
                        blockType: BlockType.COMMAND,
                        text: "AI next costume",
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiPreviousCostume",
                        blockType: BlockType.COMMAND,
                        text: "AI previous costume",
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiCostume",
                        blockType: BlockType.COMMAND,
                        text: "AI switch to costume [COSTUME]",
                        arguments: {
                            COSTUME: {
                                type: ArgumentType.STRING,
                                defaultValue: "1"
                            }
                        },
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiSay",
                        blockType: BlockType.COMMAND,
                        text: "AI say [TEXT]",
                        arguments: {
                            TEXT: {
                                type: ArgumentType.STRING,
                                defaultValue: "Hello!"
                            }
                        },
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiHide",
                        blockType: BlockType.COMMAND,
                        text: "AI hide sprite",
                        filter: [TargetType.SPRITE]
                    },

                    {
                        opcode: "aiShow",
                        blockType: BlockType.COMMAND,
                        text: "AI show sprite",
                        filter: [TargetType.SPRITE]
                    }
                ]
            };
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

        setMaxMove(args) {
            let value = Number(args.AMOUNT);

            if (!Number.isFinite(value)) {
                value = 20;
            }

            this.maxMove =
                Math.max(
                    0,
                    Math.min(100, Math.abs(value))
                );
        }

        setMaxTurn(args) {
            let value = Number(args.DEGREES);

            if (!Number.isFinite(value)) {
                value = 45;
            }

            this.maxTurn =
                Math.max(
                    0,
                    Math.min(360, Math.abs(value))
                );
        }

        enableAI() {
            this.enabled = true;
            this.lastError = "";
        }

        disableAI() {
            this.enabled = false;
        }

        stopAI() {
            this.enabled = false;
            this._requestId++;
            this._thinking = false;
        }

        aiEnabled() {
            return this.enabled;
        }

        aiThinking() {
            return this._thinking;
        }

        _getTarget(args, util) {
            if (util && util.target) {
                return util.target;
            }

            if (
                this.runtime &&
                typeof this.runtime.getEditingTarget === "function"
            ) {
                return this.runtime.getEditingTarget();
            }

            return null;
        }

        _getCostumes(target) {
            if (!target) {
                return [];
            }

            let costumes = [];

            /*
             * Scratch/Gandi targets normally expose costumes
             * through target.sprite.costumes.
             */
            if (
                target.sprite &&
                Array.isArray(target.sprite.costumes)
            ) {
                costumes = target.sprite.costumes;
            } else if (
                Array.isArray(target.costumes)
            ) {
                costumes = target.costumes;
            }

            return costumes.map((costume, index) => {
                return {
                    number: index + 1,
                    name:
                        costume && costume.name
                            ? String(costume.name)
                            : "Costume " + (index + 1)
                };
            });
        }

        _getCurrentCostume(target) {
            if (!target) {
                return 0;
            }

            if (
                typeof target.currentCostume === "number"
            ) {
                return target.currentCostume + 1;
            }

            return 1;
        }

        _getSpriteState(target) {
            if (!target) {
                return {
                    exists: false,
                    error: "No sprite target is available."
                };
            }

            const costumes =
                this._getCostumes(target);

            const state = {
                exists: true,

                name:
                    typeof target.getName === "function"
                        ? target.getName()
                        : "Sprite",

                x:
                    Number(target.x) || 0,

                y:
                    Number(target.y) || 0,

                direction:
                    Number(target.direction) || 90,

                size:
                    Number(target.size) || 100,

                visible:
                    target.visible !== false,

                draggable:
                    !!target.draggable,

                rotationStyle:
                    target.rotationStyle ||
                    "all around",

                currentCostume:
                    this._getCurrentCostume(target),

                currentCostumeName:
                    this._getCurrentCostumeName(target),

                costumes: costumes
            };

            this._lastState = state;

            return state;
        }

        _getCurrentCostumeName(target) {
            const costumes =
                this._getCostumes(target);

            const current =
                this._getCurrentCostume(target);

            if (
                costumes.length &&
                costumes[current - 1]
            ) {
                return costumes[current - 1].name;
            }

            return "";
        }

        spriteState(args, util) {
            const target =
                this._getTarget(args, util);

            return JSON.stringify(
                this._getSpriteState(target)
            );
        }

        spriteX(args, util) {
            const target =
                this._getTarget(args, util);

            return target
                ? Number(target.x) || 0
                : 0;
        }

        spriteY(args, util) {
            const target =
                this._getTarget(args, util);

            return target
                ? Number(target.y) || 0
                : 0;
        }

        spriteDirection(args, util) {
            const target =
                this._getTarget(args, util);

            return target
                ? Number(target.direction) || 90
                : 90;
        }

        spriteSize(args, util) {
            const target =
                this._getTarget(args, util);

            return target
                ? Number(target.size) || 100
                : 100;
        }

        spriteVisible(args, util) {
            const target =
                this._getTarget(args, util);

            return !!(
                target &&
                target.visible !== false
            );
        }

        costumeList(args, util) {
            const target =
                this._getTarget(args, util);

            return JSON.stringify(
                this._getCostumes(target)
            );
        }

        currentCostume(args, util) {
            const target =
                this._getTarget(args, util);

            return this._getCurrentCostume(target);
        }

        async askAI(args, util) {
            return this._askAIInternal(
                util,
                "Decide what this sprite should do next."
            );
        }

        async askAIAbout(args, util) {
            return this._askAIInternal(
                util,
                String(args.GOAL || "Decide what to do.")
            );
        }

        async askAIWithState(args, util) {
            let state;

            try {
                state =
                    JSON.parse(
                        String(args.STATE || "{}")
                    );
            } catch (error) {
                this.lastError =
                    "Invalid state JSON.";
                return;
            }

            return this._askAIInternal(
                util,
                "Decide what the sprite should do using this state.",
                state
            );
        }

        async _askAIInternal(
            util,
            goal,
            customState = null
        ) {
            if (!this.enabled) {
                this.lastError =
                    "AI control is disabled.";
                return;
            }

            if (this._thinking) {
                this.lastError =
                    "AI is already thinking.";
                return;
            }

            if (!this.apiKey) {
                this.lastError =
                    "No AI API key has been configured.";
                return;
            }

            if (!this.apiUrl) {
                this.lastError =
                    "No AI API URL has been configured.";
                return;
            }

            const target =
                this._getTarget({}, util);

            if (!target) {
                this.lastError =
                    "No sprite target is available.";
                return;
            }

            const state =
                customState ||
                this._getSpriteState(target);

            const requestId =
                ++this._requestId;

            this._thinking = true;
            this.lastError = "";

            /*
             * THIS IS THE AI'S COMPLETE COMMAND LIST.
             *
             * The AI is explicitly told that it may ONLY
             * use these commands.
             */
            const validCommands = {
                move: {
                    description:
                        "Move forward in the sprite's current direction.",
                    parameters: {
                        amount:
                            "Number of steps. Positive = forward, negative = backward."
                    },
                    example: {
                        action: "move",
                        amount: 10
                    }
                },

                turn: {
                    description:
                        "Turn the sprite relative to its current direction.",
                    parameters: {
                        degrees:
                            "Degrees to turn. Positive = clockwise, negative = counterclockwise."
                    },
                    example: {
                        action: "turn",
                        degrees: 15
                    }
                },

                point: {
                    description:
                        "Set the sprite's direction.",
                    parameters: {
                        direction:
                            "Direction in degrees."
                    },
                    example: {
                        action: "point",
                        direction: 90
                    }
                },

                goto: {
                    description:
                        "Move the sprite directly to an X/Y coordinate.",
                    parameters: {
                        x:
                            "X coordinate.",
                        y:
                            "Y coordinate."
                    },
                    example: {
                        action: "goto",
                        x: 100,
                        y: 50
                    }
                },

                changex: {
                    description:
                        "Change the sprite's X position.",
                    parameters: {
                        amount:
                            "Amount to change X by."
                    },
                    example: {
                        action: "changex",
                        amount: 10
                    }
                },

                changey: {
                    description:
                        "Change the sprite's Y position.",
                    parameters: {
                        amount:
                            "Amount to change Y by."
                    },
                    example: {
                        action: "changey",
                        amount: 10
                    }
                },

                costume: {
                    description:
                        "Switch to a specific costume by name or number.",
                    parameters: {
                        costume:
                            "Costume name or costume number."
                    },
                    example: {
                        action: "costume",
                        costume: "run"
                    }
                },

                nextcostume: {
                    description:
                        "Switch to the next costume.",
                    parameters: {},
                    example: {
                        action: "nextcostume"
                    }
                },

                prevcostume: {
                    description:
                        "Switch to the previous costume.",
                    parameters: {},
                    example: {
                        action: "prevcostume"
                    }
                },

                say: {
                    description:
                        "Make the sprite say text. The Gandi project can read the text value from the returned JSON.",
                    parameters: {
                        text:
                            "Text the sprite should say."
                    },
                    example: {
                        action: "say",
                        text: "Hello!"
                    }
                },

                hide: {
                    description:
                        "Hide the sprite.",
                    parameters: {},
                    example: {
                        action: "hide"
                    }
                },

                show: {
                    description:
                        "Show the sprite.",
                    parameters: {},
                    example: {
                        action: "show"
                    }
                },

                wait: {
                    description:
                        "Do nothing this decision.",
                    parameters: {},
                    example: {
                        action: "wait"
                    }
                }
            };

            const userPrompt =
                "GOAL:\n" +
                goal +
                "\n\n" +

                "CURRENT SPRITE STATE:\n" +
                JSON.stringify(
                    state,
                    null,
                    2
                ) +
                "\n\n" +

                "VALID COMMANDS:\n" +
                JSON.stringify(
                    validCommands,
                    null,
                    2
                ) +
                "\n\n" +

                "MOVEMENT LIMIT:\n" +
                this.maxMove +
                "\n\n" +

                "TURN LIMIT:\n" +
                this.maxTurn +
                "\n\n" +

                "STRICT JSON RULES:\n" +
                "1. Return exactly ONE JSON object.\n" +
                "2. The JSON object MUST contain an 'action' property.\n" +
                "3. The action MUST be one of: " +
                Object.keys(validCommands).join(", ") +
                ".\n" +
                "4. Never invent an action.\n" +
                "5. Do not return Markdown.\n" +
                "6. Do not explain your answer.\n" +
                "7. For costume, use a costume name or number from the supplied costume list.\n" +
                "8. For nextcostume, do not include parameters.\n" +
                "9. For prevcostume, do not include parameters.\n" +
                "10. For say, put the speech in the 'text' property.\n\n" +

                "RETURN ONLY JSON.";

            try {
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

                                messages: [
                                    {
                                        role:
                                            "system",

                                        content:
                                            this.systemPrompt
                                    },

                                    {
                                        role:
                                            "user",

                                        content:
                                            userPrompt
                                    }
                                ],

                                temperature:
                                    0.2,

                                max_tokens:
                                    250
                            })
                        }
                    );

                if (
                    requestId !==
                    this._requestId
                ) {
                    return;
                }

                if (!response.ok) {
                    const errorText =
                        await response.text();

                    throw new Error(
                        "HTTP " +
                        response.status +
                        ": " +
                        errorText
                    );
                }

                const data =
                    await response.json();

                const content =
                    this._extractAIText(data);

                this.lastResponse =
                    content || "";

                if (!content) {
                    throw new Error(
                        "AI returned an empty response."
                    );
                }

                const action =
                    this._parseAction(content);

                if (!action) {
                    throw new Error(
                        "AI did not return valid JSON."
                    );
                }

                if (
                    !this._isValidAction(action)
                ) {
                    throw new Error(
                        "AI returned an invalid command: " +
                        String(action.action)
                    );
                }

                this.lastAction =
                    JSON.stringify(action);

                /*
                 * We intentionally do NOT directly execute
                 * "say". Your Gandi script can read the
                 * returned JSON "text" value.
                 */
                if (
                    action.action === "say"
                ) {
                    return;
                }

                if (this.enabled) {
                    this._executeAction(
                        action,
                        target
                    );
                }
            } catch (error) {
                this.lastError =
                    error &&
                    error.message
                        ? error.message
                        : String(error);
            } finally {
                if (
                    requestId ===
                    this._requestId
                ) {
                    this._thinking = false;
                }
            }
        }

        _isValidAction(action) {
            if (!action) {
                return false;
            }

            const valid = [
                "move",
                "turn",
                "point",
                "goto",
                "changex",
                "changey",
                "costume",
                "nextcostume",
                "prevcostume",
                "say",
                "hide",
                "show",
                "wait"
            ];

            return valid.includes(
                String(
                    action.action || ""
                ).toLowerCase()
            );
        }

        _extractAIText(data) {
            if (!data) {
                return "";
            }

            if (
                data.choices &&
                data.choices[0] &&
                data.choices[0].message
            ) {
                const message =
                    data.choices[0].message;

                if (
                    typeof message.content ===
                    "string"
                ) {
                    return message.content.trim();
                }

                if (
                    Array.isArray(
                        message.content
                    )
                ) {
                    return message.content
                        .map(part => {
                            return part &&
                                typeof part.text ===
                                "string"
                                ? part.text
                                : "";
                        })
                        .join("")
                        .trim();
                }
            }

            if (
                typeof data.output_text ===
                "string"
            ) {
                return data.output_text.trim();
            }

            return "";
        }

        _parseAction(text) {
            let cleaned =
                String(text)
                    .trim()
                    .replace(
                        /^```json/i,
                        ""
                    )
                    .replace(
                        /^```/i,
                        ""
                    )
                    .replace(
                        /```$/i,
                        ""
                    )
                    .trim();

            try {
                return JSON.parse(
                    cleaned
                );
            } catch (error) {
                const firstBrace =
                    cleaned.indexOf("{");

                const lastBrace =
                    cleaned.lastIndexOf("}");

                if (
                    firstBrace >= 0 &&
                    lastBrace > firstBrace
                ) {
                    try {
                        return JSON.parse(
                            cleaned.substring(
                                firstBrace,
                                lastBrace + 1
                            )
                        );
                    } catch (ignored) {
                        return null;
                    }
                }
            }

            return null;
        }

        _executeAction(action, target) {
            if (!action || !target) {
                return;
            }

            const name =
                String(
                    action.action || ""
                )
                    .trim()
                    .toLowerCase();

            switch (name) {

                case "move": {
                    let amount =
                        Number(
                            action.amount
                        );

                    if (
                        !Number.isFinite(amount)
                    ) {
                        amount = 0;
                    }

                    amount =
                        Math.max(
                            -this.maxMove,
                            Math.min(
                                this.maxMove,
                                amount
                            )
                        );

                    this._moveSprite(
                        target,
                        amount
                    );

                    break;
                }

                case "turn": {
                    let degrees =
                        Number(
                            action.degrees
                        );

                    if (
                        !Number.isFinite(degrees)
                    ) {
                        degrees = 0;
                    }

                    degrees =
                        Math.max(
                            -this.maxTurn,
                            Math.min(
                                this.maxTurn,
                                degrees
                            )
                        );

                    this._turnSprite(
                        target,
                        degrees
                    );

                    break;
                }

                case "point": {
                    let direction =
                        Number(
                            action.direction
                        );

                    if (
                        !Number.isFinite(direction)
                    ) {
                        direction = 90;
                    }

                    this._pointSprite(
                        target,
                        direction
                    );

                    break;
                }

                case "goto": {
                    let x =
                        Number(action.x);

                    let y =
                        Number(action.y);

                    if (
                        !Number.isFinite(x)
                    ) {
                        x =
                            Number(target.x) ||
                            0;
                    }

                    if (
                        !Number.isFinite(y)
                    ) {
                        y =
                            Number(target.y) ||
                            0;
                    }

                    x =
                        Math.max(
                            -240,
                            Math.min(
                                240,
                                x
                            )
                        );

                    y =
                        Math.max(
                            -180,
                            Math.min(
                                180,
                                y
                            )
                        );

                    this._gotoSprite(
                        target,
                        x,
                        y
                    );

                    break;
                }

                case "changex": {
                    let amount =
                        Number(
                            action.amount
                        );

                    if (
                        !Number.isFinite(amount)
                    ) {
                        amount = 0;
                    }

                    amount =
                        Math.max(
                            -this.maxMove,
                            Math.min(
                                this.maxMove,
                                amount
                            )
                        );

                    this._changeX(
                        target,
                        amount
                    );

                    break;
                }

                case "changey": {
                    let amount =
                        Number(
                            action.amount
                        );

                    if (
                        !Number.isFinite(amount)
                    ) {
                        amount = 0;
                    }

                    amount =
                        Math.max(
                            -this.maxMove,
                            Math.min(
                                this.maxMove,
                                amount
                            )
                        );

                    this._changeY(
                        target,
                        amount
                    );

                    break;
                }

                case "costume": {
                    this._setCostume(
                        target,
                        action.costume
                    );

                    break;
                }

                case "nextcostume": {
                    this._nextCostume(
                        target
                    );

                    break;
                }

                case "prevcostume": {
                    this._previousCostume(
                        target
                    );

                    break;
                }

                case "say": {
                    /*
                     * Deliberately handled by the Gandi
                     * project instead.
                     */
                    break;
                }

                case "hide": {
                    this._hide(
                        target
                    );

                    break;
                }

                case "show": {
                    this._show(
                        target
                    );

                    break;
                }

                case "wait": {
                    break;
                }
            }
        }

        _moveSprite(target, amount) {
            const direction =
                Number(
                    target.direction
                ) || 90;

            const radians =
                direction *
                Math.PI /
                180;

            const dx =
                Math.sin(radians) *
                amount;

            const dy =
                Math.cos(radians) *
                amount;

            this._setXY(
                target,
                (Number(target.x) || 0) + dx,
                (Number(target.y) || 0) + dy
            );
        }

        _turnSprite(target, degrees) {
            this._setDirection(
                target,
                (Number(target.direction) || 90) +
                degrees
            );
        }

        _pointSprite(target, direction) {
            this._setDirection(
                target,
                direction
            );
        }

        _setDirection(target, direction) {
            if (
                typeof target.setDirection ===
                "function"
            ) {
                target.setDirection(
                    direction
                );
            } else {
                target.direction =
                    direction;
            }
        }

        _setXY(target, x, y) {
            if (
                typeof target.setXY ===
                "function"
            ) {
                target.setXY(
                    x,
                    y
                );
            } else {
                target.x = x;
                target.y = y;
            }
        }

        _gotoSprite(target, x, y) {
            this._setXY(
                target,
                x,
                y
            );
        }

        _changeX(target, amount) {
            this._setXY(
                target,
                (Number(target.x) || 0) +
                    amount,
                Number(target.y) || 0
            );
        }

        _changeY(target, amount) {
            this._setXY(
                target,
                Number(target.x) || 0,
                (Number(target.y) || 0) +
                    amount
            );
        }

        _setCostume(target, value) {
            const costumes =
                this._getCostumes(target);

            if (!costumes.length) {
                this.lastError =
                    "This sprite has no costumes.";
                return;
            }

            const stringValue =
                String(
                    value === undefined ||
                    value === null
                        ? ""
                        : value
                ).trim();

            if (!stringValue) {
                return;
            }

            let index = -1;

            /*
             * Try costume number first.
             */
            const number =
                Number(stringValue);

            if (
                Number.isInteger(number) &&
                number >= 1 &&
                number <= costumes.length
            ) {
                index =
                    number - 1;
            }

            /*
             * Otherwise search by costume name.
             */
            if (index < 0) {
                const lower =
                    stringValue.toLowerCase();

                index =
                    costumes.findIndex(
                        costume =>
                            costume.name
                                .toLowerCase() ===
                            lower
                    );
            }

            /*
             * Also allow partial name matches.
             */
            if (index < 0) {
                const lower =
                    stringValue.toLowerCase();

                index =
                    costumes.findIndex(
                        costume =>
                            costume.name
                                .toLowerCase()
                                .includes(lower)
                    );
            }

            if (index < 0) {
                this.lastError =
                    "Costume not found: " +
                    stringValue;
                return;
            }

            this._setCostumeIndex(
                target,
                index
            );
        }

        _setCostumeIndex(target, index) {
            /*
             * Scratch VM targets normally use setCostume.
             */
            if (
                typeof target.setCostume ===
                "function"
            ) {
                target.setCostume(
                    index
                );
                return;
            }

            /*
             * Fallback.
             */
            if (
                target.currentCostume !==
                undefined
            ) {
                target.currentCostume =
                    index;
            }
        }

        _nextCostume(target) {
            const costumes =
                this._getCostumes(target);

            if (!costumes.length) {
                this.lastError =
                    "This sprite has no costumes.";
                return;
            }

            let current =
                this._getCurrentCostume(
                    target
                ) - 1;

            current++;

            if (
                current >= costumes.length
            ) {
                current = 0;
            }

            this._setCostumeIndex(
                target,
                current
            );
        }

        _previousCostume(target) {
            const costumes =
                this._getCostumes(target);

            if (!costumes.length) {
                this.lastError =
                    "This sprite has no costumes.";
                return;
            }

            let current =
                this._getCurrentCostume(
                    target
                ) - 1;

            current--;

            if (current < 0) {
                current =
                    costumes.length - 1;
            }

            this._setCostumeIndex(
                target,
                current
            );
        }

        _hide(target) {
            if (
                typeof target.setVisible ===
                "function"
            ) {
                target.setVisible(
                    false
                );
            } else {
                target.visible =
                    false;
            }
        }

        _show(target) {
            if (
                typeof target.setVisible ===
                "function"
            ) {
                target.setVisible(
                    true
                );
            } else {
                target.visible =
                    true;
            }
        }

        /*
         * Direct Gandi blocks
         */

        aiMove(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action: "move",
                    amount:
                        Number(args.AMOUNT)
                },
                target
            );
        }

        aiTurn(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action: "turn",
                    degrees:
                        Number(args.DEGREES)
                },
                target
            );
        }

        aiPoint(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action: "point",
                    direction:
                        Number(args.DIRECTION)
                },
                target
            );
        }

        aiGoTo(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action: "goto",
                    x:
                        Number(args.X),
                    y:
                        Number(args.Y)
                },
                target
            );
        }

        aiChangeX(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action: "changex",
                    amount:
                        Number(args.AMOUNT)
                },
                target
            );
        }

        aiChangeY(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action: "changey",
                    amount:
                        Number(args.AMOUNT)
                },
                target
            );
        }

        aiNextCostume(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action:
                        "nextcostume"
                },
                target
            );
        }

        aiPreviousCostume(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action:
                        "prevcostume"
                },
                target
            );
        }

        aiCostume(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (!target) return;

            this._executeAction(
                {
                    action:
                        "costume",

                    costume:
                        String(
                            args.COSTUME || ""
                        )
                },
                target
            );
        }

        aiSay(args, util) {
            /*
             * This intentionally does not call Gandi's
             * built-in say function.
             *
             * Your Gandi project can use the JSON value
             * from "AI action JSON".
             */
            this.lastAction =
                JSON.stringify({
                    action: "say",
                    text:
                        String(
                            args.TEXT || ""
                        )
                });
        }

        aiHide(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (target) {
                this._hide(target);
            }
        }

        aiShow(args, util) {
            const target =
                this._getTarget(
                    args,
                    util
                );

            if (target) {
                this._show(target);
            }
        }

        lastAIResponse() {
            return this.lastResponse;
        }

        lastAIAction() {
            return this.lastAction;
        }

        lastAIError() {
            return this.lastError;
        }
    }

    Scratch.extensions.register(
        new AISpriteController(
            Scratch.vm &&
            Scratch.vm.runtime
                ? Scratch.vm.runtime
                : Scratch.runtime
        )
    );
})(Scratch);
