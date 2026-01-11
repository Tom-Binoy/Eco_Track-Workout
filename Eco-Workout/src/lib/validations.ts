import { z } from 'zod'

//Guardrail
export const exerciseSchema = z.object({
    exerciseName: z.string().min(1).toLowerCase(),
    sets: z.coerce.number().default(1),
    metricType: z.enum(['reps','duration','distance']),
    metricValue: z.coerce.number(),
    weight: z.coerce.number().nullable().optional().transform((val)=> (val === 0||val ===null? undefined:val)),
    weightUnit: z.enum(['kg','lbs']).nullable().optional().transform((val)=> (val === null? undefined:val)), //later change this to user preference
})
export const workoutArraySchema = z.array(exerciseSchema)