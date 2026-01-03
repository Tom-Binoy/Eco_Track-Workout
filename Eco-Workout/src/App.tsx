import { useState } from 'react';
import { useAction } from 'convex/react';
import { api } from '../convex/_generated/api'
//Arrays
type Message={
  id:number;
  text:string;
  from:string;
}
export default function App() {
  return (
    <>
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800">
        Eco Track
      </header>
      <main className="p-8 flex flex-col gap-16">
        <h1 className="text-4xl font-bold text-center">Eco Track</h1>
        <Content />
      </main>
    </>
  );
}

function Content() {
//API stuff
const callGeminiAction = useAction(api.myFunctions.callGemniniAPI);

  const [messages,setMessages] = useState<Message[]>([]);
  const [input,setInput] = useState("")
//functions
async function handleSend(){    //sending input
  if(input==='')return;
  const newMessage={id:Date.now(),text:input,from:'user'}
  const aiThinking={id:Date.now()+1,text:'Eco is thinking...',from:'ai'}
  setMessages([...messages, newMessage,aiThinking])
  setInput('')
  //Api Call
  try{
    const response = await callGeminiAction({userInput:input})
  setMessages(prev =>[...prev.slice(0,-1),{id:Date.now(),text:response,from:'ai'}])
  }catch(error){
    const response ='Sorry, I encountered an Error. Please try again.'
    console.error("Convex Action Error: ",error)
  setMessages(prev =>[...prev.slice(0,-1),{id:Date.now(),text:response,from:'ai'}])
  }
}

//UI
return (
  <div style={{display:'flex',flexDirection:'column', justifyContent:'center', margin:-15}}>
    {/* Message Container */}
    <div style={{padding:'20px', borderRadius:'15px', height:'70vh', width:'98vw', backgroundColor:"rgba(81, 83, 83, 1)"}}>{messages.map((message) => (<p key={message.id}>{message.from} : {message.text}</p>))}</div>
    {/* Input Container */}
    <div style={{display:'flex',flexDirection:'row', justifyContent:'center',width:'98vw'}}>
      <input onKeyDown={(e) => {if (e.key === 'Enter' && e.ctrlKey) {handleSend();e.currentTarget.value = "";}}} autoFocus={true} style={{outline: 'none', boxShadow: 'none', padding: 10, backgroundColor: "rgba(81, 83, 83, 1)", width:"98vw", height:50, border:"solid", borderColor:"rgba(126, 128, 128, 1)", borderWidth:"1px", borderRadius:10 }} value={input} onChange={(e)=>setInput(e.target.value)}/>
      <button onClick={handleSend} style={{borderRadius:5, borderWidth:'1px', marginLeft:'10px', padding:'10px', backgroundColor:"rgb(105, 143, 149)", height:'50px'}}>Send</button>
  </div>
  </div>
);
}