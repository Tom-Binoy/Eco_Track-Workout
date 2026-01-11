import { useState } from 'react';
import { useAction } from 'convex/react'; //used for calling Convex Actions
import { useMutation } from 'convex/react'  //used for calling Convex Mutations
import { api } from '../convex/_generated/api'  //DB api
import { workoutArraySchema } from './lib/validations'; //validating with Zod
import { ExerciseCard } from './exerciseCards';  //React Component
//Arrays
type Message={
  id:number;
  text:string;
  from:string;
}
export type Exercises={
  exerciseName: string;
  sets: number;
  metricType: 'reps' | 'duration' | 'distance';
  metricValue: number;
  weight?: number;
  weightUnit?: 'kg' | 'lbs' | undefined;
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
const addWorkout = useMutation(api.myFunctions.addWorkout)
const aiFeedback = useMutation(api.myFunctions.aiFeedback)

  const [currentIndex,setCurrentIndex] = useState(0)
  const [messages,setMessages] = useState<Message[]>([]);
  const [input,setInput] = useState("")
  const [draftExercises,setDraftExercises] = useState<Exercises[]>([]);
  const [confirmedExercises,setConfirmedExercises] = useState<Exercises[]>([])
//functions
function parseGeminiJSON(text: string) {//Cleaning AI response form Markdown.
  try {
    let cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (error) {
    console.error("Parse error. Raw text:", text);
    return ({
      action:'chat_response',
      data:null,
      message:text
    })
  }}
function formatAiOutput(rawAiOutput: any){//forcing the AI Output is correct format
  //gets the data field out of JSON
  const rawData = rawAiOutput.data
  const dataAsArray = Array.isArray(rawData)?rawData: rawData? [rawData]: [];
  try{
    return workoutArraySchema.parse(dataAsArray);
  }catch(error){
    console.error("Zod validation error: ",error)
    alert("The AI returned bad data, simply regenerate please.")
    return [];
  }
}
function handleNextExercise(e:React.FormEvent<HTMLFormElement>){
  e.preventDefault()  //stops page from refreshing!
  //1. Grab data from form
  const formData = new FormData(e.currentTarget)
  //2. Create Updated Object
  const updatedExercise :Exercises = { exerciseName:draftExercises[currentIndex].exerciseName,
    sets: Number(formData.get('sets')),
    metricType: formData.get('metricType') as 'reps' | 'distance' | 'duration',
    metricValue: Number(formData.get('metricValue')),
    weight: formData.get('weight')? Number(formData.get('weight')): undefined,
    weightUnit: formData.get('weightUnit')? (String(formData.get('weightUnit')) as 'kg' | 'lbs'): undefined
  }
  setConfirmedExercises([...confirmedExercises,updatedExercise])
  // 3. Logic for Next vs. Save
  if (currentIndex < draftExercises.length - 1) {
    setCurrentIndex(currentIndex + 1);
  } else {
    // This was the last card! 
    handleSaveExercise(); //need to connect this to handleSaveExercise properly
  }
}
async function handleSaveExercise(){  //Saving it to DB after confirmation
  //JSON from AI
  //calls mutation to save to DB
  try {
    const id = await addWorkout({data: draftExercises})
    console.log("Sucess! Workout sved with ID: ",id)
    alert("Workout Saved Successfully!")
  } catch(error){
    console.error("Save failed: ", error)
  }
}
async function handleSend(){    //sending input
  if(input==='')return;
  const newMessage={id:Date.now(),text:input,from:'user'}
  const aiThinking={id:Date.now()+1,text:'Eco is thinking...',from:'ai'}
  setMessages([...messages, newMessage,aiThinking])
  setInput('')
  //Api Call
  try{
    const response = await callGeminiAction({userInput:input})
    const parseResponse = parseGeminiJSON(response)
    const message = parseResponse.message;
    if(parseResponse.action ==='log_workouts'){
      const formated = formatAiOutput(parseResponse)
      setDraftExercises(formated)
      console.log('draftExercises: ',draftExercises,'\nformated: ',formated)
    }
    console.log(parseResponse)
    setMessages(prev =>[...prev.slice(0,-1),{id:Date.now(),text:message,from:'ai'}])
  }catch(error){
    const response ='Sorry, I encountered an Error. Please try again.'
    console.error("Convex Action Error: ",error)
    setMessages(prev =>[...prev.slice(0,-1),{id:Date.now(),text:response,from:'ai'}])
  }
}
function testCardsUI(){
  const draft = {action:'log_workouts',
    data:[{exerciseName: "bench_press", sets: 2, metricType:'reps', metricValue: 10, weight: 60, weightUnit: "kg" },
    { exerciseName: "plank", sets: 5, metricType:'duration', metricValue: 60},
  {exerciseName: "push_ups", sets: 3, metricType:'reps', metricValue: 30, weight: 10, weightUnit: "kg" }]}
  setDraftExercises(formatAiOutput(draft))
  console.log('formating trial data',formatAiOutput(draft))
}

//UI
return (
  <div style={{display:'flex',flexDirection:'column', justifyContent:'center', margin:-15, height:'70vh', width:'98vw'}}>
    <button style={{borderRadius:5, borderWidth:'1px', marginLeft:'10px', padding:'10px', backgroundColor:"rgb(105, 143, 149)", height:'50px'}} onClick={testCardsUI}>Test Exercise Cards</button>
    {/* Message Container */}
    <div style={{padding:'20px', borderRadius:'15px', backgroundColor:"rgba(81, 83, 83, 1)"}}>
      {messages.map((message) => (<p key={message.id}>{message.from} : {message.text}</p>))}
      {/* Exercise Card */}
      {draftExercises.length>0 && (<form className='single-review-container' onSubmit={handleNextExercise} style={{backgroundColor:'rgba(255, 255, 255, 0.15)',padding:20, borderRadius:20,borderWidth:0.5,borderColor:'rgba(0, 0, 0, 0.52)',boxShadow:' 0px 0px 20px 2px rgba(255, 255, 255, 0.2) inset'}}>
        <p>Reviewing {currentIndex+1} of {draftExercises.length}</p>
        <ExerciseCard key={currentIndex} {...draftExercises[currentIndex]}/>
        <button type='submit' style={{backgroundColor:'rgba(0, 0, 0, 0.43)',padding:10,borderRadius:10}}>{currentIndex===draftExercises.length-1?"Finish & Save Workout":"Confirm and Next"}</button>
      </form>)}</div>
    {/* Input Container */}
    <div style={{display:'flex',flexDirection:'row', justifyContent:'center',width:'98vw'}}>
      <input onKeyDown={(e) => {if (e.key === 'Enter' && e.ctrlKey) {handleSend();e.currentTarget.value = "";}}} autoFocus={true} className='inputStyle' value={input} onChange={(e)=>setInput(e.target.value)}/>
      <button onClick={handleSend} style={{borderRadius:5, borderWidth:'1px', marginLeft:'10px', padding:'10px', backgroundColor:"rgb(105, 143, 149)", height:'50px'}}>Send</button>
  </div>
  </div>
);
}