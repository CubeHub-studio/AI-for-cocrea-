(function (Scratch) {
    'use strict';

    class TestExtension {
        getInfo() {
            return {
                id: 'testextension',
                name: 'Test Extension',
                blocks: [
                    {
                        opcode: 'hello',
                        blockType: Scratch.BlockType.REPORTER,
                        text: 'hello'
                    }
                ]
            };
        }

        hello() {
            return 'Hello from my extension!';
        }
    }

    Scratch.extensions.register(new TestExtension());

})(Scratch);
