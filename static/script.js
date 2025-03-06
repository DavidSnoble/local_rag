function addMessage(content, isUser = false, isThinking = false) {
  const chatOutput = document.getElementById('chat-output');
  if (!chatOutput) {
    console.error('chat-output element not found');
    return;
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message' : 'bot-message'} ${isThinking ? 'thinking' : ''}`;
  
  // Use proper content rendering to support markdown-like formatting
  if (isThinking) {
    messageDiv.textContent = content;
  } else {
    // For simple formatting: bold, italic, code
    const formattedContent = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')
      .replace(/\n/g, '<br>');
    
    messageDiv.innerHTML = formattedContent;
  }
  
  chatOutput.appendChild(messageDiv);
  chatOutput.scrollTop = chatOutput.scrollHeight;
  
  return messageDiv;
}

async function sendMessage() {
  const userInput = document.getElementById('user-input').value.trim();
  if (!userInput) return;

  // Add user message to chat
  addMessage(userInput, true);
  document.getElementById('user-input').value = '';

  // Show thinking indicator
  const thinkingElement = addMessage('Thinking...', false, true);

  // Send request to backend
  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: userInput,
        stream: true
      })
    });

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
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullResponse += chunk;
        
        // Update thinking message with streamed content
        if (thinkingElement) {
          thinkingElement.classList.remove('thinking');
          thinkingElement.textContent = fullResponse;
        }
        
        // Scroll to the bottom
        const chatOutput = document.getElementById('chat-output');
        if (chatOutput) {
          chatOutput.scrollTop = chatOutput.scrollHeight;
        }
      }
    } else {
      // Handle JSON response (for backward compatibility)
      const data = await response.json();
      
      // Update the thinking message with the response
      if (thinkingElement) {
        thinkingElement.classList.remove('thinking');
        
        if (data.response) {
          thinkingElement.textContent = data.response;
        } else if (data.error) {
          thinkingElement.textContent = `Error: ${data.error}`;
          thinkingElement.classList.add('error');
        } else {
          thinkingElement.textContent = 'Error: Unexpected response format';
          thinkingElement.classList.add('error');
        }
      }
    }
  } catch (error) {
    // Update thinking message with error
    if (thinkingElement) {
      thinkingElement.textContent = `Error: ${error.message}`;
      thinkingElement.classList.add('error');
      thinkingElement.classList.remove('thinking');
    }
  }
}

// Enable Enter key to send message
document.getElementById('user-input').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

// Add event listener to send button
document.addEventListener('DOMContentLoaded', () => {
  const sendButton = document.querySelector('.send-button');
  if (sendButton) {
    sendButton.addEventListener('click', sendMessage);
  }
  
  // Add scroll to top button functionality
  const scrollTopButton = document.querySelector('.scroll-top-button');
  if (scrollTopButton) {
    const chatOutput = document.getElementById('chat-output');
    
    // Initially hide the button
    scrollTopButton.style.display = 'none';
    
    // Show button when scrolled down
    chatOutput.addEventListener('scroll', () => {
      if (chatOutput.scrollTop < chatOutput.scrollHeight - chatOutput.clientHeight - 100) {
        scrollTopButton.style.display = 'flex';
      } else {
        scrollTopButton.style.display = 'none';
      }
    });
    
    // Scroll to bottom when clicked
    scrollTopButton.addEventListener('click', () => {
      chatOutput.scrollTop = chatOutput.scrollHeight;
    });
  }
});
