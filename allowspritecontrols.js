// AI Sprite Controller - complete replacement extension
(function (Scratch) {
    'use strict';

    if (!Scratch.extensions.unsandboxed) {
        throw new Error('AI Sprite Controller must run unsandboxed.');
    }

    class AISpriteController {
        constructor() {
            this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
            this.apiKey = '';
            this.model = 'llama-3.3-70b-versatile';
            this.systemPrompt = this.defaultSystemPrompt();

            this.lastResponse = '';
            this.lastError = '';
            this.busy = false;
            this.history = [];

            this.lastTarget = null;

            this.functionContexts = new WeakMap();
            this._lastFunctionContext = null;
            this._lastFunctionName = '';

            this.functionNames = [
                'say',
                'move',
                'goto',
                'turn',
                'nextCostume'
            ];

            this.runtime = Scratch.vm.runtime;
        }

        defaultSystemPrompt() {
            return [
                'You control a Scratch/Gandi sprite.',
                'Return ONLY valid JSON. Never use Markdown or code fences.',
                '',
                'Normal sprite actions:',
                '{"action":"say","text":"Hello!"}',
                '{"action":"move","steps":10}',
                '{"action":"goto","x":0,"y":0}',
                '{"action":"turn","degrees":15}',
                '{"action":"change_x","amount":10}',
                '{"action":"change_y","amount":10}',
                '{"action":"set_x","x":0}',
                '{"action":"set_y","y":0}',
                '{"action":"set_direction","degrees":90}',
                '{"action":"next_costume"}',
                '{"action":"switch_costume","costume":"costume2"}',
                '{"action":"change_size","amount":10}',
                '{"action":"set_size","size":100}',
                '{"action":"show"}',
                '{"action":"hide"}',
                '{"action":"wait","seconds":1}',
                '',
                'Function actions:',
                '{"action":"function","name":"FUNCTION_NAME","arguments":["value1","value2"]}',
                '',
                'When the user asks you to trigger a custom Gandi function, use action=function.',
                'The function name must be the exact function name requested.',
                'Arguments are stored in order.',
                'The Gandi function argument reporter is one-based.',
                'The first argument is function argument 1.',
                'The second argument is function argument 2.',
                'The third argument is function argument 3.',
                '',
                'Examples:',
                '{"action":"function","name":"jump","arguments":[50]}',
                '{"action":"function","name":"dance","arguments":["fast",10]}',
                '{"action":"function","name":"setMood","arguments":["happy"]}',
                '',
                'If a request cannot be performed, use:',
                '{"action":"say","text":"I cannot do that."}'
            ].join('\n');
        }

        getInfo() {
            return {
                id: 'aispritecontroller',
                name: 'AI Sprite Controller',
                color1: '#10b981',
                color2: '#059669',
                color3: '#047857',

                blocks: [
                    {
                        opcode: 'setApiKey',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set API key to [KEY]',
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'gsk_...'
                            }
                        }
                    },

                    {
                        opcode: 'setApiUrl',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set AI API URL to [URL]',
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    'https://api.groq.com/openai/v1/chat/completions'
                            }
                        }
                    },

                    {
                        opcode: 'setModel',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set AI model to [MODEL]',
                        arguments: {
                            MODEL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'llama-3.3-70b-versatile'
                            }
                        }
                    },

                    {
                        opcode: 'setPrompt',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set AI system prompt to [PROMPT]',
                        arguments: {
                            PROMPT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    'You control a Scratch/Gandi sprite. Return only JSON.'
                            }
                        }
                    },

                    {
                        opcode: 'ask',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'ask AI [MESSAGE]',
                        arguments: {
                            MESSAGE: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Say hello.'
                            }
                        }
                    },

                    {
                        opcode: 'response',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'AI response'
                    },

                    {
                        opcode: 'isThinking',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'AI is thinking?'
                    },

                    {
                        opcode: 'clearChat',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'clear AI conversation'
                    },

                    {
                        opcode: 'lastFunction',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'last function received'
                    },

                    {
                        opcode: 'whenFunctionReceived',
                        blockType: Scratch.BlockType.HAT,
                        text: 'when function received [FUNCTION]',
                        isEdgeActivated: false,
                        shouldRestartExistingThreads: true,
                        arguments: {
                            FUNCTION: {
                                type: Scratch.ArgumentType.STRING,
                                menu: 'functionMenu'
                            }
                        }
                    },

                    {
                        opcode: 'functionArgument',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'function argument [INDEX]',
                        arguments: {
                            INDEX: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            }
                        }
                    },

                    {
                        opcode: 'functionArgumentElse',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'function argument [INDEX] else [FALLBACK]',
                        arguments: {
                            INDEX: {
                                type: Scratch.ArgumentType.NUMBER,
                                defaultValue: 1
                            },
                            FALLBACK: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ''
                            }
                        }
                    }
                ],

                menus: {
                    functionMenu: {
                        acceptReporters: false,
                        items: 'getFunctionMenu'
                    }
                }
            };
        }

        getFunctionMenu() {
            const names = Array.from(new Set(this.functionNames));

            if (names.length === 0) {
                return [
                    {
                        text: 'function',
                        value: 'function'
                    }
                ];
            }

            return names.map(name => ({
                text: name,
                value: name
            }));
        }

        setApiKey(args) {
            this.apiKey = String(args.KEY || '').trim();
        }

        setApiUrl(args) {
            this.apiUrl = String(args.URL || '').trim();
        }

        setModel(args) {
            this.model = String(args.MODEL || '').trim();
        }

        setPrompt(args) {
            this.systemPrompt = String(args.PROMPT || '');
        }

        isThinking() {
            return this.busy;
        }

        response() {
            return this.lastResponse;
        }

        lastFunction() {
            return this._lastFunctionName || '';
        }

        clearChat() {
            this.history = [];
            this.lastResponse = '';
            this.lastError = '';
            this._lastFunctionName = '';
            this._lastFunctionContext = null;
        }

        async ask(args, util) {
            if (this.busy) {
                return;
            }

            if (!this.apiKey) {
                this.lastError = 'Set an API key first.';
                this.lastResponse = 'Error: ' + this.lastError;
                return;
            }

            const message = String(args.MESSAGE ?? '');

            this.busy = true;
            this.lastError = '';

            if (util && util.target) {
                this.lastTarget = util.target;
            }

            try {
                const messages = [
                    {
                        role: 'system',
                        content: this.systemPrompt
                    },
                    ...this.history,
                    {
                        role: 'user',
                        content: message
                    }
                ];

                const response = await Scratch.fetch(this.apiUrl, {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + this.apiKey
                    },

                    body: JSON.stringify({
                        model: this.model,
                        messages: messages,
                        temperature: 0.2
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();

                    throw new Error(
                        'HTTP ' +
                        response.status +
                        ': ' +
                        errorText.slice(0, 500)
                    );
                }

                const data = await response.json();

                const answer = String(
                    data?.choices?.[0]?.message?.content ??
                    data?.choices?.[0]?.text ??
                    ''
                ).trim();

                if (!answer) {
                    throw new Error('The API returned no text.');
                }

                this.lastResponse = answer;

                this.history.push(
                    {
                        role: 'user',
                        content: message
                    },
                    {
                        role: 'assistant',
                        content: answer
                    }
                );

                if (this.history.length > 20) {
                    this.history = this.history.slice(-20);
                }

                const command = this.parseAICommand(answer);

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
                    'AI error: ' +
                    this.lastError;
            } finally {
                this.busy = false;
            }
        }

        parseAICommand(text) {
            let cleaned = String(text || '').trim();

            cleaned = cleaned
                .replace(/^```(?:json)?\s*/i, '')
                .replace(/\s*```$/i, '')
                .trim();

            try {
                const value = JSON.parse(cleaned);

                return this.normalizeCommand(value);
            } catch (_) {
            }

            const object = this.extractJSONObject(cleaned);

            if (!object) {
                return null;
            }

            try {
                return this.normalizeCommand(
                    JSON.parse(object)
                );
            } catch (_) {
                return null;
            }
        }

        extractJSONObject(text) {
            const start = text.indexOf('{');

            if (start < 0) {
                return null;
            }

            let depth = 0;
            let inString = false;
            let escaped = false;

            for (let i = start; i < text.length; i++) {
                const ch = text[i];

                if (inString) {
                    if (escaped) {
                        escaped = false;
                    } else if (ch === '\\') {
                        escaped = true;
                    } else if (ch === '"') {
                        inString = false;
                    }

                    continue;
                }

                if (ch === '"') {
                    inString = true;
                } else if (ch === '{') {
                    depth++;
                } else if (ch === '}') {
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
                typeof command !== 'object'
            ) {
                return null;
            }

            const action =
                String(command.action || '').trim();

            if (!action) {
                return null;
            }

            if (action === 'function') {
                const name = String(
                    command.name ??
                    command.function ??
                    ''
                ).trim();

                let args = command.arguments;

                if (!Array.isArray(args)) {
                    args = [];
                }

                if (!name) {
                    return null;
                }

                this.registerFunction(name);

                return {
                    action: 'function',
                    name: name,
                    arguments: args
                };
            }

            return {
                ...command,
                action: action
            };
        }

        registerFunction(name) {
            name = String(name || '').trim();

            if (!name) {
                return;
            }

            if (!this.functionNames.includes(name)) {
                this.functionNames.push(name);
            }
        }

        async executeCommand(command, target) {
            if (
                !command ||
                !command.action
            ) {
                return;
            }

            switch (command.action) {
                case 'say':
                    this.doSay(
                        target,
                        command.text
                    );
                    break;

                case 'move':
                    if (target) {
                        const steps =
                            this.toNumber(
                                command.steps,
                                0
                            );

                        const radians =
                            (target.direction - 90) *
                            Math.PI /
                            180;

                        target.setXY(
                            target.x +
                            steps *
                            Math.cos(radians),

                            target.y +
                            steps *
                            Math.sin(radians)
                        );
                    }
                    break;

                case 'goto':
                    if (target) {
                        target.setXY(
                            this.toNumber(
                                command.x,
                                target.x
                            ),

                            this.toNumber(
                                command.y,
                                target.y
                            )
                        );
                    }
                    break;

                case 'turn':
                    if (target) {
                        target.setDirection(
                            target.direction +
                            this.toNumber(
                                command.degrees,
                                0
                            )
                        );
                    }
                    break;

                case 'change_x':
                    if (target) {
                        target.setXY(
                            target.x +
                            this.toNumber(
                                command.amount,
                                0
                            ),

                            target.y
                        );
                    }
                    break;

                case 'change_y':
                    if (target) {
                        target.setXY(
                            target.x,

                            target.y +
                            this.toNumber(
                                command.amount,
                                0
                            )
                        );
                    }
                    break;

                case 'set_x':
                    if (target) {
                        target.setXY(
                            this.toNumber(
                                command.x,
                                target.x
                            ),

                            target.y
                        );
                    }
                    break;

                case 'set_y':
                    if (target) {
                        target.setXY(
                            target.x,

                            this.toNumber(
                                command.y,
                                target.y
                            )
                        );
                    }
                    break;

                case 'set_direction':
                    if (target) {
                        target.setDirection(
                            this.toNumber(
                                command.degrees,
                                target.direction
                            )
                        );
                    }
                    break;

                case 'next_costume':
                    this.nextCostume(target);
                    break;

                case 'switch_costume':
                    this.switchCostume(
                        target,
                        command.costume
                    );
                    break;

                case 'change_size':
                    if (
                        target &&
                        typeof target.setSize === 'function'
                    ) {
                        target.setSize(
                            target.size +
                            this.toNumber(
                                command.amount,
                                0
                            )
                        );
                    }
                    break;

                case 'set_size':
                    if (
                        target &&
                        typeof target.setSize === 'function'
                    ) {
                        target.setSize(
                            this.toNumber(
                                command.size,
                                target.size
                            )
                        );
                    }
                    break;

                case 'show':
                    if (target) {
                        target.visible = true;
                    }
                    break;

                case 'hide':
                    if (target) {
                        target.visible = false;
                    }
                    break;

                case 'wait':
                    await this.delay(
                        Math.max(
                            0,
                            this.toNumber(
                                command.seconds,
                                0
                            )
                        ) * 1000
                    );
                    break;

                case 'function':
                    this.fireFunction(
                        command.name,
                        Array.isArray(command.arguments)
                            ? command.arguments
                            : []
                    );
                    break;

                default:
                    break;
            }
        }

        doSay(target, text) {
            if (!target) {
                return;
            }

            const value =
                String(text ?? '');

            if (
                typeof target.setSay ===
                'function'
            ) {
                target.setSay(value);
            } else {
                target.say = value;
            }
        }

        nextCostume(target) {
            if (!target) {
                return;
            }

            const count =
                target.sprite?.costumes?.length || 0;

            if (count <= 0) {
                return;
            }

            if (
                typeof target.setCostume ===
                'function'
            ) {
                const current =
                    Number.isFinite(
                        target.currentCostume
                    )
                        ? target.currentCostume
                        : 0;

                const next =
                    (current + 1) % count;

                target.setCostume(next);
                return;
            }

            target.currentCostume =
                (target.currentCostume + 1) %
                count;
        }

        switchCostume(target, costume) {
            if (!target) {
                return;
            }

            const costumes =
                target.sprite?.costumes || [];

            const wanted =
                String(costume ?? '');

            let index = -1;

            if (/^-?\d+$/.test(wanted)) {
                index =
                    Number(wanted) - 1;
            } else {
                index =
                    costumes.findIndex(
                        costumeData =>
                            String(
                                costumeData.name || ''
                            ).toLowerCase() ===
                            wanted.toLowerCase()
                    );
            }

            if (
                index >= 0 &&
                index < costumes.length &&
                typeof target.setCostume ===
                'function'
            ) {
                target.setCostume(index);
            }
        }

        fireFunction(name, args) {
            name =
                String(name || '').trim();

            if (!name) {
                return;
            }

            this.registerFunction(name);

            this._lastFunctionName = name;

            const context = {
                name: name,
                args: Array.isArray(args)
                    ? args.slice()
                    : []
            };

            this._lastFunctionContext =
                context;

            const threads =
                Scratch.vm.runtime.startHats(
                    'aispritecontroller_whenFunctionReceived',
                    {
                        FUNCTION: name
                    }
                );

            for (
                const thread of threads || []
            ) {
                this.functionContexts.set(
                    thread,
                    context
                );
            }
        }

        functionArgument(args, util) {
            const context =
                this.getFunctionContext(util);

            if (!context) {
                return '';
            }

            const values =
                context.args || [];

            const index =
                Math.floor(
                    this.toNumber(
                        args.INDEX,
                        1
                    )
                ) - 1;

            if (
                index < 0 ||
                index >= values.length
            ) {
                return '';
            }

            return this.stringifyArgument(
                values[index]
            );
        }

        functionArgumentElse(args, util) {
            const context =
                this.getFunctionContext(util);

            const fallback =
                String(
                    args.FALLBACK ?? ''
                );

            const index =
                Math.floor(
                    this.toNumber(
                        args.INDEX,
                        1
                    )
                ) - 1;

            if (!context) {
                return fallback;
            }

            const values =
                context.args || [];

            if (
                index < 0 ||
                index >= values.length
            ) {
                return fallback;
            }

            const value =
                values[index];

            if (
                value === undefined ||
                value === null
            ) {
                return fallback;
            }

            return this.stringifyArgument(
                value
            );
        }

        getFunctionContext(util) {
            if (util?.thread) {
                const direct =
                    this.functionContexts.get(
                        util.thread
                    );

                if (direct) {
                    return direct;
                }

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
                this._lastFunctionContext ||
                null
            );
        }

        stringifyArgument(value) {
            if (
                typeof value === 'string'
            ) {
                return value;
            }

            if (
                typeof value === 'number' ||
                typeof value === 'boolean'
            ) {
                return String(value);
            }

            try {
                return JSON.stringify(value);
            } catch (_) {
                return String(value);
            }
        }

        toNumber(value, fallback) {
            const number =
                Number(value);

            return Number.isFinite(number)
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
