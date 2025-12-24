import { useState } from 'react';
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
  const [messages,setMessages] = useState<Message[]>([]);
  const [input,setInput] = useState("")
//functions
function handleSend(){
  if(input==='')return;
  const newMessage={id:Date.now(),text:input,from:'user'}
  setMessages([...messages, newMessage,{id:Date.now()+1,text:"Hey there, I'm Eco. Your Workout Assistant.",from:'ai'}])//Wouldn't both user and AI have same id this way?
  setInput('')
}

//UI
return (
  <div>
    <div>{messages.map((message) => (<p>message.text</p>))}</div>
    <input value={input} onChange={(e)=>setInput(e.target.value)}/>
    <button onClick={handleSend}>Send</button>
  </div>
);
}