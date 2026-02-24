import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";

/**
 * Notification types for classroom events.
 * Strict exclusions: Discussion messages, Whiteboard updates, AI Chat interactions.
 */
export type NotificationType =
  | "NOTE_UPLOAD"
  | "QUIZ_PUBLISHED"
  | "LIVE_CLASS_STARTED"
  | "FLASHCARD_DECK_CREATED"
  | "SESSION_SCHEDULED";

interface NotificationPayload {
  classId: string;
  className: string;
  type: NotificationType;
  message: string;
  actorName: string;
  actorUid: string;
}

/**
 * Write a notification document to the global `notifications` collection.
 * Called automatically after teacher administrative actions.
 *
 * Collection: `notifications/{autoId}`
 * Fields: classId, className, type, message, actorName, actorUid, createdAt
 */
export async function createNotification(payload: NotificationPayload): Promise<void> {
  try {
    await addDoc(collection(db, "notifications"), {
      ...payload,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Notification write is non-blocking — never break the main flow
    console.error("Failed to write notification:", err);
  }
}
