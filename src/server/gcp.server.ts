import { GoogleGenAI } from "@google/genai";
import { Firestore } from "@google-cloud/firestore";
import { Storage } from "@google-cloud/storage";

/**
 * All Google Cloud clients authenticate with Application Default Credentials:
 * locally via `gcloud auth application-default login`, on Cloud Run via the
 * service account attached to the service. No API keys anywhere.
 */
function required(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing env var ${name}`);
	return value;
}

export const config = {
	get project() {
		return required("GOOGLE_CLOUD_PROJECT");
	},
	get bucket() {
		return required("GCS_BUCKET");
	},
	get model() {
		return process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
	},
	get location() {
		return process.env.GEMINI_LOCATION ?? "global";
	},
};

let firestore: Firestore | undefined;
let storage: Storage | undefined;
let genai: GoogleGenAI | undefined;

export function db(): Firestore {
	firestore ??= new Firestore({
		projectId: config.project,
		ignoreUndefinedProperties: true,
	});
	return firestore;
}

export function bucket() {
	storage ??= new Storage({ projectId: config.project });
	return storage.bucket(config.bucket);
}

/**
 * Gemini on Vertex AI (service-account auth, reads images from gs://) is the
 * default. Setting GEMINI_API_KEY switches to the Gemini Developer API, which
 * needs the image bytes inline instead.
 */
export const usesVertex = () => !process.env.GEMINI_API_KEY;

export function ai(): GoogleGenAI {
	genai ??= usesVertex()
		? new GoogleGenAI({
				vertexai: true,
				project: config.project,
				location: config.location,
			})
		: new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
	return genai;
}
