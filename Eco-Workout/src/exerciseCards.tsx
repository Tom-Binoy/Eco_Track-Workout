import {Exercises} from './App'

export type CardProps = Exercises&{
  index:number,
  total:number,
  isStack:boolean
}
export const Tilt_Angles =[0,3,-3,6,-6]
export function ExerciseCard(props: CardProps) { // Capitalized E for React naming conventions
  const rotation = Tilt_Angles[props.index]
  const stackStyles = props.isStack ? {
  position: 'absolute' as const,
  zIndex: props.total - props.index,
  transform: `translateY(${props.index * 8}px) rotate(${rotation}deg)`,
  transition: 'all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275)', // Jobs-ian "pop"
} : {};
  return (
    <div className='absolute' style={stackStyles}> 
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
/* */