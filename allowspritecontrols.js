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

            this.apiKey = "";
            this.apiUrl = "https://api.openai.com/v1/chat/completions";
            this.model = "gpt-4o-mini";

            this.systemPrompt =
                "You are controlling a sprite in a Scratch-compatible game. " +
                "Return ONLY valid JSON. Never return Markdown. " +
                "Choose a small number of safe actions based on the sprite state.";

            this.lastResponse = "";
            this.lastAction = "";
            this.lastError = "";

            this.enabled = true;

            this.maxMove = 20;
            this.maxTurn = 45;

            this.actionQueue = [];

            this._thinking = false;
            this._requestId = 0;

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
                                    "https://api.openai.com/v1/chat/completions"
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
                                defaultValue: "gpt-4o-mini"
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
                                defaultValue: "decide what to do"
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
                        opcode: "runLastAction",
                        blockType: BlockType.COMMAND,
                        text: "run last AI action"
                    },

                    {
                        opcode: "runAction",
                        blockType: BlockType.COMMAND,
                        text: "run AI action [ACTION]",
                        arguments: {
                            ACTION: {
                                type: ArgumentType.STRING,
                                defaultValue: "move"
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

                    "---- AI RESULTS ----",

                    {
                        opcode: "lastAIResponse",
                        blockType: BlockType.REPORTER,
                        text: "AI response"
                    },

                    {
                        opcode: "lastAIAction",
                        blockType: BlockType.REPORTER,
                        text: "AI action"
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

                    "---- DIRECT ACTIONS ----",

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
            this.apiKey = String(args.KEY || "");
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

            this.maxMove = Math.max(0, Math.min(100, Math.abs(value)));
        }

        setMaxTurn(args) {
            let value = Number(args.DEGREES);

            if (!Number.isFinite(value)) {
                value = 45;
            }

            this.maxTurn = Math.max(0, Math.min(360, Math.abs(value)));
        }

        enableAI() {
            this.enabled = true;
            this.lastError = "";
        }

        disableAI() {
            this.enabled = false;
        }

        aiEnabled() {
            return this.enabled;
        }

        aiThinking() {
            return this._thinking;
        }

        stopAI() {
            this.enabled = false;
            this._requestId++;
            this._thinking = false;
            this.actionQueue = [];
        }

        _getTarget(args, util) {
            if (util && util.target) {
                return util.target;
            }

            if (this.runtime && this.runtime.getEditingTarget) {
                return this.runtime.getEditingTarget();
            }

            return null;
        }

        _getSpriteState(target) {
            if (!target) {
                return {
                    exists: false,
                    error: "No sprite target is available."
                };
            }

            const state = {
                exists: true,
                name: target.getName
                    ? target.getName()
                    : target.sprite?.name || "Sprite",

                x: Number(target.x) || 0,
                y: Number(target.y) || 0,
                direction: Number(target.direction) || 90,
                size: Number(target.size) || 100,

                visible:
                    target.visible !== false,

                draggable:
                    !!target.draggable,

                rotationStyle:
                    target.rotationStyle || "all around",

                currentCostume:
                    Number(target.currentCostume) || 0
            };

            this._lastState = state;

            return state;
        }

        spriteState(args, util) {
            const target = this._getTarget(args, util);
            return JSON.stringify(this._getSpriteState(target));
        }

        spriteX(args, util) {
            const target = this._getTarget(args, util);
            return target ? Number(target.x) || 0 : 0;
        }

        spriteY(args, util) {
            const target = this._getTarget(args, util);
            return target ? Number(target.y) || 0 : 0;
        }

        spriteDirection(args, util) {
            const target = this._getTarget(args, util);
            return target ? Number(target.direction) || 90 : 90;
        }

        spriteSize(args, util) {
            const target = this._getTarget(args, util);
            return target ? Number(target.size) || 100 : 100;
        }

        spriteVisible(args, util) {
            const target = this._getTarget(args, util);
            return !!(target && target.visible !== false);
        }

        async askAI(args, util) {
            return this._askAIInternal(
                util,
                "Decide what this sprite should do next."
            );
        }

        async askAIAbout(args, util) {
            const goal = String(args.GOAL || "decide what to do");

            return this._askAIInternal(
                util,
                goal
            );
        }

        async askAIWithState(args, util) {
            let state;

            try {
                state = JSON.parse(String(args.STATE || "{}"));
            } catch (e) {
                this.lastError = "Invalid state JSON.";
                return;
            }

            return this._askAIInternal(
                util,
                "Decide what the sprite should do using the supplied state.",
                state
            );
        }

        async _askAIInternal(util, goal, customState = null) {
            if (!this.enabled) {
                this.lastError = "AI control is disabled.";
                return;
            }

            if (this._thinking) {
                this.lastError = "AI is already thinking.";
                return;
            }

            if (!this.apiKey) {
                this.lastError = "No AI API key has been configured.";
                return;
            }

            if (!this.apiUrl) {
                this.lastError = "No AI API URL has been configured.";
                return;
            }

            const target = this._getTarget({}, util);

            if (!target) {
                this.lastError = "No sprite target is available.";
                return;
            }

            const state =
                customState ||
                this._getSpriteState(target);

            const requestId = ++this._requestId;

            this._thinking = true;
            this.lastError = "";

            const allowedActions = {
                move: "Move the sprite forward by a number of steps.",
                turn: "Turn the sprite by a number of degrees.",
                point: "Point the sprite in a direction.",
                goto: "Move the sprite to an x/y coordinate.",
                changex: "Change the sprite's X position.",
                changey: "Change the sprite's Y position.",
                say: "Make the sprite say something.",
                hide: "Hide the sprite.",
                show: "Show the sprite.",
                wait: "Do nothing for this decision."
            };

            const userPrompt =
                "GOAL:\n" +
                goal +
                "\n\n" +
                "CURRENT SPRITE STATE:\n" +
                JSON.stringify(state, null, 2) +
                "\n\n" +
                "ALLOWED ACTIONS:\n" +
                JSON.stringify(allowedActions, null, 2) +
                "\n\n" +
                "Movement limit: " +
                this.maxMove +
                "\n" +
                "Turn limit: " +
                this.maxTurn +
                "\n\n" +
                "Return exactly one JSON object in this format:\n" +
                "{\n" +
                '  "action": "move",\n' +
                '  "amount": 10\n' +
                "}\n\n" +
                "Examples:\n" +
                '{"action":"move","amount":10}\n' +
                '{"action":"turn","degrees":15}\n' +
                '{"action":"point","direction":90}\n' +
                '{"action":"goto","x":100,"y":50}\n' +
                '{"action":"changex","amount":10}\n' +
                '{"action":"changey","amount":-10}\n' +
                '{"action":"say","text":"Hello!"}\n' +
                '{"action":"hide"}\n' +
                '{"action":"show"}\n' +
                '{"action":"wait"}';

            try {
                const response = await fetch(this.apiUrl, {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json",
                        "Authorization":
                            "Bearer " + this.apiKey
                    },

                    body: JSON.stringify({
                        model: this.model,

                        messages: [
                            {
                                role: "system",
                                content: this.systemPrompt
                            },
                            {
                                role: "user",
                                content: userPrompt
                            }
                        ],

                        temperature: 0.2,

                        max_tokens: 200
                    })
                });

                if (requestId !== this._requestId) {
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
                        "AI did not return valid action JSON."
                    );
                }

                this.lastAction =
                    JSON.stringify(action);

                if (this.enabled) {
                    this._executeAction(
                        action,
                        target
                    );
                }
            } catch (error) {
                this.lastError =
                    error && error.message
                        ? error.message
                        : String(error);
            } finally {
                if (requestId === this._requestId) {
                    this._thinking = false;
                }
            }
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

                if (typeof message.content === "string") {
                    return message.content.trim();
                }

                if (Array.isArray(message.content)) {
                    return message.content
                        .map(part => {
                            if (
                                part &&
                                typeof part.text === "string"
                            ) {
                                return part.text;
                            }

                            return "";
                        })
                        .join("")
                        .trim();
                }
            }

            if (typeof data.output_text === "string") {
                return data.output_text.trim();
            }

            return "";
        }

        _parseAction(text) {
            let cleaned =
                String(text)
                    .trim()
                    .replace(/^```json/i, "")
                    .replace(/^```/i, "")
                    .replace(/```$/i, "")
                    .trim();

            try {
                return JSON.parse(cleaned);
            } catch (e) {
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

        runLastAction(args, util) {
            if (!this.lastAction) {
                return;
            }

            let action;

            try {
                action =
                    JSON.parse(this.lastAction);
            } catch (e) {
                return;
            }

            const target =
                this._getTarget(args, util);

            if (target) {
                this._executeAction(
                    action,
                    target
                );
            }
        }

        runAction(args, util) {
            const actionName =
                String(args.ACTION || "")
                    .trim()
                    .toLowerCase();

            const target =
                this._getTarget(args, util);

            if (!target) {
                this.lastError =
                    "No sprite target is available.";
                return;
            }

            this._executeAction(
                {
                    action: actionName
                },
                target
            );
        }

        _executeAction(action, target) {
            if (!action || !target) {
                return;
            }

            const name =
                String(action.action || "")
                    .trim()
                    .toLowerCase();

            switch (name) {

                case "move": {
                    let amount =
                        Number(action.amount);

                    if (!Number.isFinite(amount)) {
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
                        Number(action.degrees);

                    if (!Number.isFinite(degrees)) {
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
                        Number(action.direction);

                    if (!Number.isFinite(direction)) {
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

                    if (!Number.isFinite(x)) {
                        x = Number(target.x) || 0;
                    }

                    if (!Number.isFinite(y)) {
                        y = Number(target.y) || 0;
                    }

                    x =
                        Math.max(
                            -240,
                            Math.min(240, x)
                        );

                    y =
                        Math.max(
                            -180,
                            Math.min(180, y)
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
                        Number(action.amount);

                    if (!Number.isFinite(amount)) {
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
                        Number(action.amount);

                    if (!Number.isFinite(amount)) {
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

                case "say": {
                    const text =
                        String(
                            action.text || ""
                        ).substring(0, 500);

                    this._say(
                        target,
                        text
                    );

                    break;
                }

                case "hide": {
                    this._hide(target);
                    break;
                }

                case "show": {
                    this._show(target);
                    break;
                }

                case "wait":
                case "":
                    break;

                default:
                    this.lastError =
                        "Unknown AI action: " +
                        name;
                    break;
            }
        }

        _moveSprite(target, amount) {
            if (
                typeof target.setXY === "function"
            ) {
                const direction =
                    Number(target.direction) || 90;

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

                target.setXY(
                    (Number(target.x) || 0) + dx,
                    (Number(target.y) || 0) + dy
                );

                return;
            }

            if (
                target.sprite &&
                target.sprite.x !== undefined
            ) {
                target.sprite.x += amount;
            }
        }

        _turnSprite(target, degrees) {
            if (
                typeof target.setDirection === "function"
            ) {
                target.setDirection(
                    (Number(target.direction) || 90) +
                    degrees
                );

                return;
            }

            if (target.direction !== undefined) {
                target.direction += degrees;
            }
        }

        _pointSprite(target, direction) {
            if (
                typeof target.setDirection === "function"
            ) {
                target.setDirection(direction);
                return;
            }

            target.direction = direction;
        }

        _gotoSprite(target, x, y) {
            if (
                typeof target.setXY === "function"
            ) {
                target.setXY(x, y);
                return;
            }

            target.x = x;
            target.y = y;
        }

        _changeX(target, amount) {
            const x =
                (Number(target.x) || 0) +
                amount;

            if (
                typeof target.setXY === "function"
            ) {
                target.setXY(
                    x,
                    Number(target.y) || 0
                );
            } else {
                target.x = x;
            }
        }

        _changeY(target, amount) {
            const y =
                (Number(target.y) || 0) +
                amount;

            if (
                typeof target.setXY === "function"
            ) {
                target.setXY(
                    Number(target.x) || 0,
                    y
                );
            } else {
                target.y = y;
            }
        }

        _say(target, text) {
            if (
                this.runtime &&
                this.runtime.emit &&
                target
            ) {
                this.runtime.emit(
                    "SAY",
                    target,
                    text,
                    false
                );
            }

            if (
                typeof target.setVariable === "function"
            ) {
                try {
                    target.setVariable(
                        "AI Speech",
                        text
                    );
                } catch (e) {
                    // Ignore unavailable variables.
                }
            }

            target._aiSpeech = text;
        }

        _hide(target) {
            if (
                typeof target.setVisible === "function"
            ) {
                target.setVisible(false);
                return;
            }

            target.visible = false;
        }

        _show(target) {
            if (
                typeof target.setVisible === "function"
            ) {
                target.setVisible(true);
                return;
            }

            target.visible = true;
        }

        aiMove(args, util) {
            const target =
                this._getTarget(args, util);

            if (!target) {
                return;
            }

            let amount =
                Number(args.AMOUNT);

            if (!Number.isFinite(amount)) {
                amount = 0;
            }

            this._executeAction(
                {
                    action: "move",
                    amount: amount
                },
                target
            );
        }

        aiTurn(args, util) {
            const target =
                this._getTarget(args, util);

            if (!target) {
                return;
            }

            let degrees =
                Number(args.DEGREES);

            if (!Number.isFinite(degrees)) {
                degrees = 0;
            }

            this._executeAction(
                {
                    action: "turn",
                    degrees: degrees
                },
                target
            );
        }

        aiPoint(args, util) {
            const target =
                this._getTarget(args, util);

            if (!target) {
                return;
            }

            this._executeAction(
                {
                    action: "point",
                    direction: Number(args.DIRECTION)
                },
                target
            );
        }

        aiGoTo(args, util) {
            const target =
                this._getTarget(args, util);

            if (!target) {
                return;
            }

            this._executeAction(
                {
                    action: "goto",
                    x: Number(args.X),
                    y: Number(args.Y)
                },
                target
            );
        }

        aiChangeX(args, util) {
            const target =
                this._getTarget(args, util);

            if (!target) {
                return;
            }

            this._executeAction(
                {
                    action: "changex",
                    amount: Number(args.AMOUNT)
                },
                target
            );
        }

        aiChangeY(args, util) {
            const target =
                this._getTarget(args, util);

            if (!target) {
                return;
            }

            this._executeAction(
                {
                    action: "changey",
                    amount: Number(args.AMOUNT)
                },
                target
            );
        }

        aiSay(args, util) {
            const target =
                this._getTarget(args, util);

            if (!target) {
                return;
            }

            this._executeAction(
                {
                    action: "say",
                    text: String(args.TEXT || "")
                },
                target
            );
        }

        aiHide(args, util) {
            const target =
                this._getTarget(args, util);

            if (target) {
                this._hide(target);
            }
        }

        aiShow(args, util) {
            const target =
                this._getTarget(args, util);

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
            Scratch.vm && Scratch.vm.runtime
                ? Scratch.vm.runtime
                : Scratch.runtime
        )
    );
})(Scratch);
