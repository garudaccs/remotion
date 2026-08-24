import type {_Object} from '@aws-sdk/client-s3';
import type {AwsProvider} from '@remotion/lambda-client';
import type {FullClientSpecifics} from '@remotion/serverless';
import {toPosixRelativePath} from './make-s3-key';

export const getS3DiffOperations = async ({
	objects,
	bundle,
	prefix,
	onProgress,
	fullClientSpecifics,
}: {
	objects: _Object[];
	bundle: string;
	prefix: string;
	onProgress: (bytes: number) => void;
	fullClientSpecifics: FullClientSpecifics<AwsProvider>;
}) => {
	let totalBytes = 0;
	const dir = fullClientSpecifics.readDirectory({
		dir: bundle,
		etags: {},
		originalDir: bundle,
		onProgress: (bytes) => {
			totalBytes += bytes;
			onProgress(totalBytes);
		},
	});

	const posixDir: typeof dir = {};
	for (const [key, value] of Object.entries(dir)) {
		posixDir[toPosixRelativePath(key)] = value;
	}

	const filesOnS3ButNotLocal: _Object[] = [];
	for (const fileOnS3 of objects) {
		const key = fileOnS3.Key?.substring(prefix.length + 1) as string;
		if (!posixDir[key]) {
			filesOnS3ButNotLocal.push(fileOnS3);
		}
	}

	const localFilesNotOnS3: string[] = [];
	for (const d of Object.keys(posixDir)) {
		let found: _Object | undefined;
		for (const o of objects) {
			const key = o.Key?.substring(prefix.length + 1) as string;
			if (key === d && o.ETag === (await posixDir[d]())) {
				found = o;
				break;
			}
		}

		if (!found) {
			localFilesNotOnS3.push(d);
		}
	}

	const existing: string[] = [];
	for (const d of Object.keys(posixDir)) {
		for (const o of objects) {
			const key = o.Key?.substring(prefix.length + 1) as string;
			if (key === d && o.ETag === (await posixDir[d]())) {
				existing.push(d);
				break;
			}
		}
	}

	return {
		toDelete: filesOnS3ButNotLocal,
		toUpload: localFilesNotOnS3,
		existingCount: existing.length,
	};
};
