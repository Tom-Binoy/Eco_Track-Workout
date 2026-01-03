Code:
```//functions
function handleSend(){
  if(input==='')return;
  const newMessage={id:Date.now(),text:input,from:'user'}
  setMessages([...messages, newMessage])
  setAiState='Eco is thinking...'
  //api call & stuff code
  setMessage([...,{id:Date.now(),text:response,from:'ai'}])
}
```tsx
I have update the other parts of the code like this:
```
function Content() {
  const [aiState,setAiState] =useState('Eco is Ready!')```tsx
  Then inside a parent div:
```<div>{aiState}</div>
```tsx