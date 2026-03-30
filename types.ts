export interface Attribute {
  id: string;
  name: string;
  isPk: boolean; // Primary Key
  type?: string; // e.g., int, varchar (optional for display)
}

export interface Entity {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  attributes: Attribute[];
}

export interface Connection {
  id: string; // Unique ID for the connection leg
  entityId: string;
  cardinality: string; // e.g., "0..1", "1..n"
}

export type RelationType = 'association' | 'inheritance' | 'interface';

export interface Association {
  id: string;
  label: string; // The verb (e.g., "appartient", "possède")
  entityName?: string; // Specific name for the Associative Entity (e.g. "Participation")
  x: number; // Association is now a node (Diamond/Text)
  y: number;
  entityBoxX?: number; // Independent position for the associative entity box
  entityBoxY?: number;
  attributes: Attribute[]; // For "Entité-Association"
  connections: Connection[]; // Supports n-ary (1, 2, 3...)
  isLabelMovable?: boolean; // For binary associations: can the label be moved freely?
  relationType?: RelationType; // Type of UML relation arrow
}

export interface Point {
  x: number;
  y: number;
}