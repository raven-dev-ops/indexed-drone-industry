import { z } from 'zod';
import content from '../../data/learning.json';
import { aircraft, collections, events, lessons, observations, parts, relationships, scenarios } from './data';
import { evidence, id, segments } from './schema';

const text = z.string().min(1);
const guidedContent = z.object({
  lessons: z.array(z.object({
    id,
    task: text,
    tool: z.object({ section: z.enum(['aircraft', 'labs', 'supply', 'facilities']), id: id.optional(), label: text }),
    question: text,
    options: z.tuple([text, text, text]),
    answer: z.union([z.literal(0), z.literal(1), z.literal(2)]),
    explanation: text,
  })),
  journeys: z.array(z.object({
    segment: z.enum(Object.keys(segments) as (keyof typeof segments)[]),
    aircraft: id,
    summary: text,
    part: id,
    partContext: text,
    partSource: evidence.optional(),
    pathway: id,
    material: id,
    atlasLayer: id,
    atlasContext: text,
    relationship: id.optional(),
    event: id,
    eventScope: z.enum(['Direct aircraft case', 'Related aircraft case', 'Related operator case', 'Upstream case']),
    eventContext: text,
  })),
}).parse(content);

if (guidedContent.lessons.length !== lessons.length || new Set(guidedContent.lessons.map(lesson => lesson.id)).size !== lessons.length) {
  throw new Error('Guided learning requires one distinct activity per lesson.');
}

export const guidedLessons = lessons.map(lesson => {
  const activity = guidedContent.lessons.find(item => item.id === lesson.id);
  if (!activity) throw new Error(`Missing guided activity for ${lesson.id}.`);
  const { section, id } = activity.tool;
  if (section === 'labs' ? id !== undefined : !collections[section].some(row => row.id === id)) {
    throw new Error(`Invalid guided activity destination for ${lesson.id}.`);
  }
  return { ...lesson, activity };
});

if (new Set(guidedContent.journeys.map(journey => journey.segment)).size !== Object.keys(segments).length ||
  guidedContent.journeys.length !== Object.keys(segments).length) {
  throw new Error('Segment journeys require one distinct entry per segment.');
}

export const segmentJourneys = guidedContent.journeys.map(journey => {
  const model = aircraft.find(row => row.id === journey.aircraft && row.segment === journey.segment);
  const part = parts.find(row => row.id === journey.part);
  const pathway = scenarios.find(row => row.id === journey.pathway);
  const material = collections.materials.find(row => row.id === journey.material);
  const event = events.find(row => row.id === journey.event);
  const relationship = relationships.find(row => row.id === journey.relationship);
  if (!model || !part || !pathway || !material || !event || !observations.some(row => row.layer === journey.atlasLayer)) {
    throw new Error(`Unresolved records in the ${journey.segment} journey.`);
  }
  if (part.pathway !== material.pathway || (pathway.mode === 'representative' && part.pathway !== pathway.id) ||
    (journey.eventScope === 'Direct aircraft case' && pathway.event !== event.id)) {
    throw new Error(`Mismatched pathway evidence in the ${journey.segment} journey.`);
  }
  if (journey.relationship && (!relationship || ![relationship.from, relationship.to].some(endpoint => endpoint.section === 'aircraft' && endpoint.id === model.id))) {
    throw new Error(`Unrelated lifecycle record in the ${journey.segment} journey.`);
  }
  const relatedRecord = relationship && (relationship.from.section === 'aircraft' && relationship.from.id === model.id
    ? relationship.to : relationship.from);
  return { ...journey, model, part, pathway, material, event, relationship, relatedRecord };
});
