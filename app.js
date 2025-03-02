const promtForm = document.querySelector(".promt-form");
const promtInput = document.querySelector(".promt-input");
const chatContainer = document.querySelector(".chats-container");
const container = document.querySelector(".container");
const fileInput = document.querySelector("#file-input");
const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
const themeToggle = document.querySelector("#theme-toggle-btn");
const themeIcon = themeToggle.querySelector("i");

//api setup 
const API_KEY = "AIzaSyBfhPItAMzjHXiKKWfQQDFQdOwwmXuCaBk";

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;

let typingInterval ,controller;
const userData = { message: "", file: {} };

const chatHistory = [];


//adding the classes and content to the new div
const createMsgElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("msg", ...classes);  //div will contian the style of msg and use-msg
    div.innerHTML = content;
    return div;
}

//add uto scroll animation 
const scrollToBottom = () => container.scrollTo({ top: container.scrollHeight, behavior: "smooth" })

//function that display bot reponse with typing effect 
const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.textContent = "";
    const word = text.split(" ");
    let wordIndex = 0;

    //set an interval to type each word 
     typingInterval = setInterval(() => {
        if (wordIndex < word.length) {
            textElement.textContent += (wordIndex === 0 ? "" : " ") + word[wordIndex++];
            scrollToBottom();
        }
        else {
            clearInterval(typingInterval);
            botMsgDiv.classList.remove("loading");
            document.body.classList.remove("bot-responding");

        }
    }, 40);

}

//making api call and generate the bot's message 
const generateResponse = async (botMsgDiv) => {
    const textElement = botMsgDiv.querySelector(".message-text");  //getting the element text from botmsgdiv 
    controller = new AbortController();  //AbortController is a JavaScript API that allows us to cancel fetch requests before they complete

    chatHistory.push({   //add user messge and file data to the chat history 
        role: "user",
        parts: [{ text: userData.message }, ...(userData.file.data ? [{ inline_data: (({ fileName, isImage, ...rest }) => rest)(userData.file) }] : [])]
            //{ text: userData.message } → Stores the user's text message.
    });


    try {
        //send the chat history to the API to give  the reponse 
        const response = await fetch(API_URL, {
            method: "POST",                                   //Sends a POST request to API_URL with chatHistory as the body.
            headers: { "Content-Type": "application/json" },    
            body: JSON.stringify({ contents: chatHistory }),     //await ensures the function waits for the API to respond. Headers indicate that the data is JSON
            signal: controller.signal    //The signal property links the fetch request to the controller. If controller.abort() is called later, it immediately cancels this fetch request.
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error.message);

        //Extracts the bot’s response text from the JSON.Removes Markdown bold (**text**) using regex.Removes extra spaces with .trim().
        const responsetext = data.candidates[0].content.parts[0].text.replace(/\*\*([^*]+)\*\*/g, "$1").trim();

        //process the reponse text and display it with typing effect  
        typingEffect(responsetext, textElement, botMsgDiv); //typing effect 


        chatHistory.push({ role: "model", parts: [{ text: responsetext }] });  //The bot's response is added to chatHistory with role: "model".This ensures that past conversations are remembered in the next API request.

    } catch (error) {
        textElement.style.color = "#d62939"
        textElement.textContent = error.name === "AbortError" ? "Response Generation Stopped." : error.message;
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
    } finally {
        userData.file = {};
    }
}

//handle the form reponse 
const handleFormSubmit = (e) => {
    e.preventDefault();

    const userMessage = promtInput.value.trim();
    if (!userMessage || document.body.classList.contains("bot-responding")) return;

    promtInput.value = "";
    userData.message = userMessage;
    document.body.classList.add("bot-responding","chats-active");
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");  //remove the file or image after file is dispplay in the chat 

    const userMsgHTML = `
     <p class="message-text"></p>
     ${userData.file.data ? (userData.file.isImage ? `<img src = "data: ${userData.file.mime_type};base64,${userData.file.data}" class = "img-attached"/>` : `<p class = "file-attached"><i class="fa-solid fa-file"></i>${userData.file.fileName}</p>`) : ""}
     `; //This is a ternary operator checking whether a file exists and how to display it.

    const userMsgDiv = createMsgElement(userMsgHTML, "user-msg");  //here user-msg is class name for the property of  class
    userMsgDiv.querySelector(".message-text").textContent = userMessage;

    chatContainer.appendChild(userMsgDiv);//adding the usermsgdiv to chatcontainer as new div
    scrollToBottom();

    setTimeout(() => {
        const botMsgHTML = ` <img src="gemini.svg" alt="" class="avtar"><p class="message-text">Just a sec....</p>`;
        const botMsgDiv = createMsgElement(botMsgHTML, "bot-msg", "loading");   //here bot-msg is class name for the property of  class
        chatContainer.appendChild(botMsgDiv);
        generateResponse(botMsgDiv);
        scrollToBottom();


    }, 600);


}

//handle file input (file upload)
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
        const base64String = e.target.result.split(",")[1]
        fileInput.value = "";
        fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
        fileUploadWrapper.classList.add("active", isImage ? "img-attached" : "file-attached");

        //store file data in userData object 
        userData.file = { fileName: file.name, data: base64String, mime_type: file.type, isImage }
    }
});

//cancel the upload file 
document.querySelector("#cancel-file-btn").addEventListener("click", () => {
    userData.file = {};
    fileUploadWrapper.classList.remove("active", "img-attached", "file-attached");
});

//stop ongoing bot reponse 
document.querySelector("#stop-promt-btn").addEventListener("click", () => {
    userData.file = {};
    controller?.abort();    //Aborts the fetch request if controller exists (?. avoids errors if controller is undefined).
    clearInterval(typingInterval);
    chatContainer.querySelector(".bot-msg.loading").classList.remove("loading");
    document.body.classList.remove("bot-responding");
    
});

//delete chat history 
document.querySelector("#delete-chat-btn").addEventListener("click", () => {
    chatHistory.length = 0;
    chatContainer.innerHTML = "";
    document.body.classList.remove("bot-responding" , "chats-active");

});

//search the suggestion items in the bot search
document.querySelectorAll(".suggestion-item").forEach(item =>{
    item.addEventListener("click",()=>{
        promtInput.value = item.querySelector(".text").textContent;
        promtForm.dispatchEvent(new Event("submit"));  //promtForm.dispatchEvent(new Event("submit")) programmatically submits the form. Normally, users submit forms by pressing Enter or clicking a submit button, but this code automatically triggers submission after selecting a suggestion.
    })
});

//show/hide control for mobile on promt input focus
document.addEventListener("click",({target})=>{
    const wrapper = document.querySelector(".promt-wrapper");
    const ShouldHide = target.classList.contains("promt-input") || (wrapper.classList.contains("hide-control") && (target.id === "add-file-btn" ||  target.id === "stop-promt-btn"));
    wrapper.classList.toggle("hide-control",ShouldHide);
})

//function that change the day and night icon according to the theme 
function updateIcon() {
    if (document.body.classList.contains("light-theme")) {
        themeIcon.classList.remove("fa-sun");
        themeIcon.classList.add("fa-moon");
        localStorage.setItem("theme","light"); //stored in the local stored
    } else {
        themeIcon.classList.remove("fa-moon");
        themeIcon.classList.add("fa-sun");
        localStorage.setItem("theme", "night");
    }
}

// apply the local stored theme from the local storage
function applyThemeStorage () {
    const savedTheme = localStorage.getItem("theme");
    if(savedTheme == "light"){
        document.body.classList.add("light-theme");
    }
    else{
        document.body.classList.remove("light-theme");
    }
    updateIcon();
}

//theme toggle 
themeToggle.addEventListener("click",()=>{
    document.body.classList.toggle("light-theme");
    updateIcon();
});

applyThemeStorage();



promtForm.addEventListener("submit", handleFormSubmit);
promtForm.querySelector("#add-file-btn").addEventListener("click", () => fileInput.click());

