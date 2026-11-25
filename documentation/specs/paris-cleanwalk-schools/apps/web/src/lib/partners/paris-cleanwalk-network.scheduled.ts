import type { ScheduledParisCleanwalkRelation } from "./paris-cleanwalk-network";

export interface ScheduledParisOperation {
  id: string; label: string; date: string; status: "programme";
  provenance: { kind: "declaration_organisateur"; declaredOn: string; publicUrl: null };
  schoolActorId: string; schoolIdentification: "declaree" | "probable"; announcedSchoolName: string;
  location: string | null; arrondissement: number | null; meetingPoint: string | null;
  time: string | null; route: string | null; classes: string | null;
  studentCount: number | null; supervisors: number | null; equipment: string | null;
  actors: readonly { actorId: string; role: "porteur" | "collaborateur" | "participant" | null }[];
}

// Organizer declarations: no automatic promotion when the date passes.
export const PARIS_SCHEDULED_OPERATIONS: readonly ScheduledParisOperation[] = [
  {
    "id": "cleanwalk-ellipse-champ-de-mars-2026-12-04",
    "label": "Cleanwalk Ellipse",
    "date": "2026-12-04",
    "status": "programme",
    "provenance": {
      "kind": "declaration_organisateur",
      "declaredOn": "2026-11-25",
      "publicUrl": null
    },
    "schoolActorId": "school-uai-0756544f",
    "schoolIdentification": "declaree",
    "announcedSchoolName": "Lycée Ellipse International Academy",
    "location": "Champ-de-Mars, Paris 7e",
    "arrondissement": 7,
    "meetingPoint": null,
    "time": null,
    "route": null,
    "classes": null,
    "studentCount": null,
    "supervisors": null,
    "equipment": null,
    "actors": [
      {
        "actorId": "school-uai-0756544f",
        "role": "porteur"
      },
      {
        "actorId": "cleanmymap",
        "role": "collaborateur"
      },
      {
        "actorId": "asso-featured-1",
        "role": "collaborateur"
      }
    ]
  },
  {
    "id": "cleanwalk-voltaire-brigade-verte-2026-11-30",
    "label": "Cleanwalk école Voltaire",
    "date": "2026-11-30",
    "status": "programme",
    "provenance": {
      "kind": "declaration_organisateur",
      "declaredOn": "2026-11-25",
      "publicUrl": null
    },
    "schoolActorId": "school-uai-0751241s",
    "schoolIdentification": "probable",
    "announcedSchoolName": "École Voltaire, Paris 11e",
    "location": null,
    "arrondissement": null,
    "meetingPoint": null,
    "time": null,
    "route": null,
    "classes": null,
    "studentCount": null,
    "supervisors": null,
    "equipment": null,
    "actors": [
      {
        "actorId": "school-uai-0751241s",
        "role": null
      },
      {
        "actorId": "asso-featured-1",
        "role": "collaborateur"
      }
    ]
  }
];

export function projectScheduledRelations(operations: readonly ScheduledParisOperation[]): ScheduledParisCleanwalkRelation[] {return operations.flatMap(op=>op.actors.filter(a=>a.actorId!==op.schoolActorId&&a.role==="collaborateur").map(a=>({id:`rel-${op.id}-${a.actorId}`,sourceId:op.schoolActorId,targetId:a.actorId,relationType:"collaboration_programmee",operationId:op.id,title:"Collaboration programmée",summary:"Déclaration de l’organisateur ; aucune preuve de réalisation ni partenariat permanent.",frequencyKnown:false,source:{label:"Déclaration de l’organisateur",url:null,declaredOn:op.provenance.declaredOn,certainty:"partiel_ou_incertain",provenance:"declaration_organisateur"}})))}

export function getScheduledOperation(id: string) { return PARIS_SCHEDULED_OPERATIONS.find(op => op.id === id); }
export function getScheduledOperationsForActor(id: string) { return PARIS_SCHEDULED_OPERATIONS.filter(op => op.actors.some(a => a.actorId === id)); }
