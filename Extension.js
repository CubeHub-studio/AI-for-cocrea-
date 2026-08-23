```javascript
(function (Scratch) {
    'use strict';

    /*
     * COCREA AI Extension
     * Adds:
     *  - set API key to [ ]
     *  - set API URL to [ ]
     *  - set AI model to [ ]
     *  - set system prompt to [ ]
     *  - ask AI [ ]
     *  - AI response
     *  - AI is thinking?
     *  - clear AI conversation
     */

    class COCREAAI {
        constructor() {
            // Configuration
            this.apiKey = '';
            this.apiUrl = 'https://api.openai.com/v1/chat/completions';
            this.model = 'gpt-4o-mini';
            this.systemPrompt = 'You are a helpful AI assistant.';

            // Conversation history
            this.conversation = [];

            // State
            this.response = '';
            this.thinking = false;
        }

        getInfo() {
            return {
                id: 'cocreaai',
                name: 'AI Chat',
                color1: '#6366f1',
                color2: '#4f46e5',
                color3: '#4338ca',

                blocks: [
                    {
                        opcode: 'setApiKey',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set API key to [KEY]',
                        arguments: {
                            KEY: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: ''
                            }
                        }
                    },

                    {
                        opcode: 'setApiUrl',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set API URL to [URL]',
                        arguments: {
                            URL: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    'https://api.openai.com/v1/chat/completions'
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
                                defaultValue: 'gpt-4o-mini'
                            }
                        }
                    },

                    {
                        opcode: 'setSystemPrompt',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'set system prompt to [PROMPT]',
                        arguments: {
                            PROMPT: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue:
                                    'You are a helpful AI assistant.'
                            }
                        }
                    },

                    {
                        opcode: 'askAI',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'ask AI [QUESTION]',
                        arguments: {
                            QUESTION: {
                                type: Scratch.ArgumentType.STRING,
                                defaultValue: 'Hello!'
                            }
                        }
                    },

                    {
                        opcode: 'getResponse',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'AI response'
                    },

                    {
                        opcode: 'isThinking',
                        blockType: Scratch.BlockType.BOOLEAN,
                        text: 'AI is thinking?'
                    },

                    {
                        opcode: 'clearConversation',
                        blockType: Scratch.BlockType.COMMAND,
                        text: 'clear AI conversation'
                    }
                ]
            };
        }

        setApiKey(args) {
            this.apiKey = String(args.KEY);
        }

        setApiUrl(args) {
            this.apiUrl = String(args.URL);
        }

        setModel(args) {
            this.model = String(args.MODEL);
        }

        setSystemPrompt(args) {
            this.systemPrompt = String(args.PROMPT);
        }

        async askAI(args) {
            const question = String(args.QUESTION);

            if (!question.trim()) {
                this.response = 'Error: Question is empty.';
                return;
            }

            if (!this.apiKey.trim()) {
                this.response = 'Error: API key has not been set.';
                return;
            }

            if (!this.apiUrl.trim()) {
                this.response = 'Error: API URL has not been set.';
                return;
            }

            this.thinking = true;

            try {
                // Add the user's message to the conversation.
                this.conversation.push({
                    role: 'user',
                    content: question
                });

                // Build messages.
                const messages = [
                    {
                        role: 'system',
                        content: this.systemPrompt
                    },
                    ...this.conversation
                ];

                const response = await fetch(this.apiUrl, {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.apiKey}`
                    },

                    body: JSON.stringify({
                        model: this.model,
                        messages: messages
                    })
                });

                if (!response.ok) {
                    const errorText = await response.text();

                    throw new Error(
                        `HTTP ${response.status}: ${errorText}`
                    );
                }

                const data = await response.json();

                /*
                 * Standard OpenAI-compatible response:
                 *
                 * choices[0].message.content
                 */
                let answer = '';

                if (
                    data &&
                    data.choices &&
                    data.choices[0] &&
                    data.choices[0].message
                ) {
                    answer = data.choices[0].message.content;
                }

                // Some APIs may return a plain response field.
                if (!answer && typeof data.response === 'string') {
                    answer = data.response;
                }

                if (!answer) {
                    answer = 'Error: The AI returned no response.';
                }

                this.response = String(answer);

                // Save the assistant response for conversation memory.
                this.conversation.push({
                    role: 'assistant',
                    content: this.response
                });

            } catch (error) {
                console.error('COCREA AI Extension Error:', error);

                this.response =
                    'Error: ' + (error.message || String(error));

            } finally {
                this.thinking = false;
            }
        }

        getResponse() {
            return this.response;
        }

        isThinking() {
            return this.thinking;
        }

        clearConversation() {
            this.conversation = [];
            this.response = '';
        }
    }

    Scratch.extensions.register(new COCREAAI());

})(Scratch);
```
