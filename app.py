from flask import Flask, request, jsonify, render_template
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_ollama import OllamaLLM
from langchain_core.documents import Document
import sys

app = Flask(__name__)

# Initialize the chatbot components
context = """
This is a generic chatbot. It can answer questions based on the information provided to it.
For now, it knows a little about AI: Artificial Intelligence (AI) is the simulation of human intelligence in machines.
AI systems can perform tasks like learning, problem-solving, and decision-making.
"""
documents = [Document(page_content=context)]

text_splitter = RecursiveCharacterTextSplitter(chunk_size=500, chunk_overlap=50)
docs = text_splitter.split_documents(documents)
embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
vector_store = FAISS.from_documents(docs, embeddings)
llm = OllamaLLM(model="qwq", base_url="http://localhost:11434")
#llm = OllamaLLM(model="phi4", base_url="http://localhost:11434")


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    print("Chat request received")
    user_input = request.json.get('message', '')
    print(f"User input: {user_input}")
    try:
        if user_input.strip():
            # Retrieve relevant documents
            retriever = vector_store.as_retriever(search_kwargs={"k": 3})
            retrieved_docs = retriever.invoke(user_input)
            context = "\n".join([doc.page_content for doc in retrieved_docs])
            # Create prompt
            prompt = (
                f"Based on this context:\n{context}\n\nAnswer the question: {user_input}"
            )
            
            # Check if we're streaming or not
            if request.json.get('stream', False):
                print(f"Streaming response for prompt: {prompt}")
                # Stream response
                def generate():
                    for chunk in llm.stream(prompt):
                        print(f"Chunk: {chunk}")
                        yield chunk
                
                return app.response_class(generate(), mimetype="text/plain")
            else:
                # Non-streaming response for compatibility with existing UI
                print(f"Non-streaming response for prompt: {prompt}")
                chatOutput = llm.invoke(prompt)
                return jsonify({"response": chatOutput})
        else:
            chatOutput = "I'm not sure how to respond to that."
            return jsonify({"response": chatOutput})
    except Exception as e:
        chatOutput = f"Error processing your request: {str(e)}"
        return jsonify({"response": chatOutput})


if __name__ == "__main__":
    print(f"Loaded and split {len(docs)} document chunks.")
    print("Starting chatbot server...")
    app.run(debug=True, host="0.0.0.0", port=5000)
