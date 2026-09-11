/**
 * Program seed entry point. Version-tag the seed so exported data and stored
 * sessions can say which program revision produced them.
 */
export const PROGRAM_VERSION = '1.0.0';
export const PROGRAM_NAME = '52-Week Push/Pull/Legs, Schedule-Proof';

export * from './types';
export * from './exercises';
export * from './blocks';
export * from './core';
export * from './fullbody';
export * from './reference';
export * as decisions from './decisions';
