import { z } from 'zod'

//Guardrail
export const exerciseSchema = z.object({
    exerciseName: z.string().min(1).toLowerCase(),
    sets: z.coerce.number().default(1),
    reps: z.coerce.number().optional(),
    weight: z.coerce.number().optional().transform((val)=> (val === 0? null:val)),
    unit: z.string().default("kg"),  //later change this to user pr0ference
    duration: z.coerce.number().optional().transform((val)=> (val === 0? null:val)),
    distance: z.coerce.number().optional().transform((val)=>(val === 0? null:val))
})
export const workoutArraySchema = z.array(exerciseSchema)