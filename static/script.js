function addMessage(content, isUser = false) {
  const chatOutput = document.getElementById('chat-output'); // This is correct
  if (!chatOutput) {
    console.error('chat-output element not found');
    return;
  }
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'}`;
  messageDiv.textContent = content;
  chatOutput.appendChild(messageDiv);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

async function sendMessage() {
  const userInput = document.getElementById('user-input').value.trim();
  if (!userInput) return;

  // Add user message to chat
  addMessage(userInput, true);
  document.getElementById('user-input').value = '';

  // Show thinking indicator directly using the addMessage function
  addMessage('Thinking...', false);
  const thinkingElement = document.querySelector('.bot-message:last-child');

  // Send request to backend
  fetch('/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 
      message: userInput,
      stream: true  // Add this parameter to request streaming
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    
    // Check if we're getting a stream or JSON
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/plain')) {
      // Handle streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';
      
      function readStream() {
        reader.read().then(({ done, value }) => {
          if (done) {
            return;
          }
          
          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          
          // Update thinking message with streamed content
          if (thinkingElement) {
            thinkingElement.textContent = fullResponse;
          }
          
          // Scroll to the bottom
          const chatOutput = document.getElementById('chat-output');
          if (chatOutput) {
            chatOutput.scrollTop = chatOutput.scrollHeight;
          }
          
          // Continue reading
          readStream();
        });
      }
      
      readStream();
    } else {
      // Handle JSON response (for backward compatibility)
      return response.json().then(data => {
        // Update the thinking message with the response
        if (thinkingElement) {
          if (data.response) {
            thinkingElement.textContent = data.response;
          } else if (data.error) {
            thinkingElement.textContent = `Error: ${data.error}`;
          } else {
            thinkingElement.textContent = 'Error: Unexpected response format';
          }
        }
      });
    }
  })
  .catch(error => {
    // Update thinking message with error
    if (thinkingElement) {
      thinkingElement.textContent = `Error: ${error.message}`;
    }
  });
}

// Enable Enter key to send message
document.getElementById('user-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});
