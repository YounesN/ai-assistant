import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('extension.openOllamaChat', () => {
		// Create and show a new webview panel
		const panel = vscode.window.createWebviewPanel(
			'ollamaChat', // Identifies the type of the webview
			'Ollama Chat', // Title of the panel
			vscode.ViewColumn.Beside, // Open the panel in a side column
			{
				enableScripts: true, // Enable JavaScript in the webview
				retainContextWhenHidden: true // Retain the webview state when hidden
			}
		);

		// Set the HTML content for the webview
		panel.webview.html = getWebviewContent();

		// Handle messages from the webview
		panel.webview.onDidReceiveMessage(async (message) => {
			switch (message.command) {
				case 'sendMessage':
					const userMessage = message.text;
					const ollamaResponse = await sendToOllama(userMessage);

					// Send the response back to the webview
					panel.webview.postMessage({
						command: 'receiveMessage',
						text: ollamaResponse
					});
					break;
			}
		}, undefined, context.subscriptions);
	});

	context.subscriptions.push(disposable);
}

function getWebviewContent(): string {
	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Ollama Chat</title>
            <style>
                body {
                    font-family: Roboto, sans-serif;
                    padding: 0px;
                    background-color: #292a2d;
                }
                #chat {
                    overflow-y: auto;
                    padding: 10px;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                }
                .message {
                    max-width: 70%;
                    padding: 10px 15px;
                    border-radius: 15px;
                    position: relative;
                    word-wrap: break-word;
                }
                .user-message {
                    background-color: #414158;
                    color: white;
                    align-self: flex-end;
                    border-bottom-right-radius: 5px;
                }
                .bot-message {
                    background-color: #e1e1e1;
                    color: black;
                    align-self: flex-start;
                    border-bottom-left-radius: 5px;
                }
                #input-container {
                    margin: 0 auto;  /* Centers it horizontally */
                    display: flex;
                    padding: 10px;
                    position: fixed;
                    bottom: 10px; /* Keep some space from the bottom */
                    left: 50%;
                    transform: translateX(-50%); /* Centering trick */
                    width: 70%;
                    background-color: #292a2d; /* Optional: Match background */
                    border-radius: 10px; /* Optional: Add some rounding */
                }
                #input {
                    color: #fffff;
                    flex: 1;
                    padding: 10px;
                    border: 1px solid #404057;
                    border-radius: 10px;
                    outline: none;
                    background-color: #404045;
                }
                #input:focus {
                    border-color: #0078d4;
                }
				.timestamp {
					font-size: 0.8em;
					color: #ccc;
					margin-top: 5px;
				}
				.message {
					opacity: 0;
					transform: translateY(10px);
					animation: fadeIn 0.3s ease forwards;
				}

				@keyframes fadeIn {
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
            </style>
        </head>
        <body>
            <div id="chat"></div>
            <div id="input-container">
                <input id="input" type="text" placeholder="Type your message here..." />
            </div>
            <script>
                const vscode = acquireVsCodeApi();

                const chatDiv = document.getElementById('chat');
                const inputBox = document.getElementById('input');

                inputBox.addEventListener('keydown', (event) => {
                    if (event.key === 'Enter') {
                        const userMessage = inputBox.value;
                        if (userMessage) {
                            // Display user message in the chat
                            chatDiv.innerHTML += \`
                                <div class="message user-message">
                                    <strong>You:</strong> \${userMessage}
									<div class="timestamp">${new Date().toLocaleTimeString()}</div>
                                </div>
                            \`;
                            inputBox.value = '';

                            // Send the message to the extension
                            vscode.postMessage({
                                command: 'sendMessage',
                                text: userMessage
                            });

                            // Scroll to the bottom of the chat
                            chatDiv.scrollTop = chatDiv.scrollHeight;
                        }
                    }
                });

                // Listen for messages from the extension
                window.addEventListener('message', (event) => {
                    const message = event.data;
                    if (message.command === 'receiveMessage') {
                        // Display Ollama's response in the chat
                        chatDiv.innerHTML += \`
                            <div class="message bot-message">
                                <strong>Ollama:</strong> \${message.text}
                            </div>
                        \`;

                        // Scroll to the bottom of the chat
                        chatDiv.scrollTop = chatDiv.scrollHeight;
                    }
                });
            </script>
        </body>
        </html>
    `;
}

async function sendToOllama(prompt: string): Promise<string> {
	const ollamaUrl = 'http://localhost:11434/api/generate'; // Ollama API endpoint
	try {
		const response = await axios.post(ollamaUrl, {
			prompt: prompt,
			model: 'deepseek-r1:32b', // Specify the model
			max_tokens: 100,
			stream: false,
		});
		return response.data.response; // Return the response from Ollama
	} catch (e) {
		if (typeof e === "string") {
			return e.toUpperCase();
		} else if (e instanceof Error) {
			return e.message;
		} else {
			return "Unknown error";
		}
	}
}

export function deactivate() { }