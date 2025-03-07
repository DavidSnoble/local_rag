let uploadedDocuments = [];

function addMessage(content, isUser = false, isThinking = false) {
  const chatOutput = document.getElementById('chat-output');
  if (!chatOutput) {
    console.error('chat-output element not found');
    return;
  }

  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user-message bg-blue-500 text-white self-end rounded-2xl rounded-br-sm px-4 py-3 max-w-[80%]' : 'bot-message bg-gray-100 text-gray-800 self-start rounded-2xl rounded-bl-sm px-4 py-3 max-w-[80%]'} ${isThinking ? 'thinking opacity-70' : ''}`;

  if (!isUser && !isThinking) {
    const avatar = document.createElement('span');
    avatar.className = 'avatar w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-sm mr-2';
    avatar.textContent = 'L';
    messageDiv.appendChild(avatar);
  }

  const textSpan = document.createElement('span');
  textSpan.innerHTML = isThinking ? content : formatMessageContent(content);
  messageDiv.appendChild(textSpan);

  const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const timeSpan = document.createElement('span');
  timeSpan.className = 'timestamp text-xs opacity-70 mt-1 block';
  timeSpan.textContent = timestamp;
  messageDiv.appendChild(timeSpan);

  chatOutput.appendChild(messageDiv);
  chatOutput.scrollTop = chatOutput.scrollHeight;

  return messageDiv;
}

function addDocumentMessage(filename, docId) {
  const chatOutput = document.getElementById('chat-output');
  const messageDiv = document.createElement('div');
  messageDiv.className = 'message document-message bg-gray-200 text-gray-800 text-center p-2 rounded-lg my-2 max-w-md mx-auto flex justify-between items-center';

  const ext = filename.split('.').pop().toLowerCase();
  let iconClass;
  switch (ext) {
    case 'pdf': iconClass = 'fas fa-file-pdf'; break;
    case 'docx':
    case 'doc': iconClass = 'fas fa-file-word'; break;
    case 'txt': iconClass = 'fas fa-file-alt'; break;
    default: iconClass = 'fas fa-file';
  }

  messageDiv.innerHTML = `
    <span><i class="${iconClass} mr-2 text-blue-600"></i>Document uploaded: ${filename}</span>
    <button onclick="deleteDocument('${docId}')" class="bg-red-500 text-white border-none p-1 px-2 rounded hover:bg-red-600">Delete</button>
  `;
  chatOutput.appendChild(messageDiv);
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

document.addEventListener('DOMContentLoaded', function () {
  // Send button
  document.getElementById('send-button').addEventListener('click', sendMessage);

  // Enter key to send
  document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
  });

  // Attach button and modal
  document.getElementById('attach-button').addEventListener('click', () => {
    document.getElementById('attach-modal').style.display = 'block';
  });

  document.getElementById('close-modal').addEventListener('click', () => {
    document.getElementById('attach-modal').style.display = 'none';
  });

  document.getElementById('document-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleDocumentUpload(e);
    document.getElementById('attach-modal').style.display = 'none';
  });

  // Drag and drop
  const chatOutput = document.getElementById('chat-output');
  chatOutput.addEventListener('dragover', (e) => {
    e.preventDefault();
    chatOutput.classList.add('drag-over');
  });
  chatOutput.addEventListener('dragleave', () => {
    chatOutput.classList.remove('drag-over');
  });
  chatOutput.addEventListener('drop', async (e) => {
    e.preventDefault();
    chatOutput.classList.remove('drag-over');
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('documents', files[i]);
      }
      await uploadFiles(formData);
    }
  });

  // Scroll-to-top button
  const scrollTopButton = document.querySelector('.scroll-top-button');
  chatOutput.addEventListener('scroll', () => {
    if (chatOutput.scrollTop < chatOutput.scrollHeight - chatOutput.clientHeight - 100) {
      scrollTopButton.style.display = 'flex';
    } else {
      scrollTopButton.style.display = 'none';
    }
  });
  scrollTopButton.addEventListener('click', () => {
    chatOutput.scrollTop = chatOutput.scrollHeight;
  });
});

async function handleDocumentUpload(e) {
  const fileInput = document.getElementById('document-upload');
  const files = fileInput.files;
  if (files.length === 0) {
    alert('Please select at least one file to upload');
    return;
  }

  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('documents', files[i]);
  }

  await uploadFiles(formData);
  fileInput.value = '';
}

async function uploadFiles(formData) {
  try {
    const response = await fetch('/upload-documents', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) throw new Error('Failed to upload documents');

    const result = await response.json();
    result.documents.forEach(doc => {
      uploadedDocuments.push(doc);
      addDocumentMessage(doc.filename, doc.id);
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    alert('Error uploading documents: ' + error.message);
  }
}

async function deleteDocument(docId) {
  try {
    const response = await fetch(`/delete-document/${docId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete document');

    uploadedDocuments = uploadedDocuments.filter(doc => doc.id !== docId);
    const chatOutput = document.getElementById('chat-output');
    const docMessage = chatOutput.querySelector(`button[onclick="deleteDocument('${docId}')"]`).parentElement;
    chatOutput.removeChild(docMessage);
  } catch (error) {
    console.error('Error deleting document:', error);
    alert('Error deleting document: ' + error.message);
  }
}

async function sendMessage() {
  const userInput = document.getElementById('user-input').value.trim();
  if (!userInput) return;

  console.log("Sending message to chat endpoint");
  addMessage(userInput, true);
  document.getElementById('user-input').value = '';

  const thinkingElement = addMessage('Thinking...', false, true);

  const requestData = {
    message: userInput,
    documentIds: uploadedDocuments.map(doc => doc.id),
    stream: true
  };

  try {
    // Create POST request options
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestData)
    };

    // Send the POST request to /chat
    const response = await fetch('/chat', requestOptions);
    
    if (!response.ok) {
      console.error("Response not OK:", response.status);
      throw new Error('Network response was not ok');
    }
    
    // Process the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = '';

    // Read stream chunks
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n\n');
      buffer = lines.pop();

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const chunk = line.substring(6); // Remove 'data: ' prefix
          
          if (chunk === '[DONE]') {
            // Streaming complete - final update
            if (thinkingElement) {
              thinkingElement.classList.remove('thinking');
              thinkingElement.querySelector('span:not(.timestamp)').innerHTML = formatMessageContent(fullResponse);
            }
          } else {
            // Append to the response
            fullResponse += chunk;
            if (thinkingElement) {
              thinkingElement.classList.remove('thinking');
              thinkingElement.querySelector('span:not(.timestamp)').innerHTML = formatMessageContent(fullResponse);
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Streaming error:', error);
    if (thinkingElement) {
      thinkingElement.textContent = `Error: ${error.message}`;
      thinkingElement.classList.add('error');
      thinkingElement.classList.remove('thinking');
    }
  }
}

// Helper function to format message content with proper styling
function formatMessageContent(content) {
  // Check if the content starts with a thinking pattern
  // - Either starts with ", " (comma space) 
  // - Or starts with "I'm thinking" or similar phrases
  if (content.trim().startsWith(", ") || 
      /^(So |Hmm,? |I'?m thinking|Let me think|I need to figure)/i.test(content.trim())) {
    
    // Find where thinking ends - at a clear conclusion or declaration
    const thinkingEndPatterns = [
      /\.\s*(?=[A-Z])/,  // Period followed by capital letter
      /\n\n/,            // Double newline
      /So,? (?:to summarize|in conclusion|basically)/i, // Conclusion markers
      /Y-O-L-O is a/i    // Specific to this example, when the answer is given
    ];
    
    let endIndex = content.length;
    for (const pattern of thinkingEndPatterns) {
      const match = content.match(pattern);
      if (match && match.index < endIndex) {
        endIndex = match.index + match[0].length;
      }
    }
    
    if (endIndex < content.length) {
      const thinking = content.substring(0, endIndex);
      const remainder = content.substring(endIndex);
      
      return `<div class="think-block bg-yellow-100 text-gray-800 p-3 rounded-md my-2 text-sm italic">${thinking}</div>` + 
             formatBasicMarkdown(remainder);
    }
  }
  
  // If no thinking pattern is detected or if can't find clear end point
  return formatBasicMarkdown(content);
}

// Function to handle basic markdown formatting
function formatBasicMarkdown(content) {
  return content
    .replace(/<think>(.*?)<\/think>/gs, '<div class="think-block bg-yellow-100 text-gray-800 p-3 rounded-md my-2 text-sm italic">$1</div>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code class="bg-gray-200 px-1 py-0.5 rounded text-sm">$1</code>')
    .replace(/\n/g, '<br>');
}
