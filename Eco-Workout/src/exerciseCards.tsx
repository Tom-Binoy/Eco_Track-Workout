import {Exercises} from './App'

export function ExerciseCard(props: Exercises) { // Capitalized E for React naming conventions
  return (
    <div> 
        <span className="font-bold">Exercise Name: {props.exerciseName}</span>
        <div style={{display:'flex',flexDirection:'row', justifyContent:'left', flexWrap:'wrap', gap:10, margin:5}}>
          <div className='miniInputCoverStyle'><input className='miniInputStyle' name='sets' defaultValue={props.sets} type="number" /><span> Sets</span></div>
          <div className='miniInputCoverStyle'><input className='miniInputStyle' name='metricValue' defaultValue={props.metricValue}></input>
          <select name='metricType' defaultValue={props.metricType}>
            <option value='reps'>Reps</option>
            <option value='distance'>Distance{'(km)'}</option>
            <option value='duration'>Duration{'(seconds)'}</option>
            </select></div>
          {props.weight && <div className='miniInputCoverStyle'><input className='miniInputStyle' name='weight' defaultValue={props.weight} type="number" />
          <select style={{padding:10}} name='weightUnit' defaultValue={props.weightUnit}>
            <option value='kg'>Kg</option>
            <option value='lbs'>lbs</option></select></div>}
        </div>
    </div>
  );
}
