import {expect, test} from 'bun:test';
import type {_Object} from '@aws-sdk/client-s3';
import type {AwsProvider} from '@remotion/lambda-client';
import type {FullClientSpecifics} from '@remotion/serverless';
import {getS3DiffOperations} from '../../shared/get-s3-operations';
import {toPosixRelativePath} from '../../shared/make-s3-key';

const chunkEtag = '"chunk-etag"';
const indexEtag = '"index-etag"';

const windowsStyleLocalFiles = (chunkHash: string) => {
	return {
		'assets\\chunk.js': async () => chunkHash,
		'index.html': async () => indexEtag,
	};
};

test('Windows relative keys canonicalize to POSIX S3 keys', () => {
	expect(toPosixRelativePath('assets\\chunk.js')).toBe('assets/chunk.js');
	expect(toPosixRelativePath('assets/chunk.js')).toBe('assets/chunk.js');
	expect(toPosixRelativePath('index.html')).toBe('index.html');
});

test('unchanged nested asset with Windows-style relative keys is not uploaded or deleted', async () => {
	const objects: _Object[] = [
		{
			Key: 'sites/test/assets/chunk.js',
			ETag: chunkEtag,
		},
		{
			Key: 'sites/test/index.html',
			ETag: indexEtag,
		},
	];

	const operations = await getS3DiffOperations({
		objects,
		bundle: 'C:\\bundle',
		prefix: 'sites/test',
		onProgress: () => undefined,
		fullClientSpecifics: {
			readDirectory: () => windowsStyleLocalFiles(chunkEtag),
		} as FullClientSpecifics<AwsProvider>,
	});

	expect(operations).toEqual({
		toDelete: [],
		toUpload: [],
		existingCount: 2,
	});
});

test('changed nested Windows-style asset uploads the POSIX key and does not delete it', async () => {
	const objects: _Object[] = [
		{
			Key: 'sites/test/assets/chunk.js',
			ETag: chunkEtag,
		},
		{
			Key: 'sites/test/index.html',
			ETag: indexEtag,
		},
	];

	const operations = await getS3DiffOperations({
		objects,
		bundle: 'C:\\bundle',
		prefix: 'sites/test',
		onProgress: () => undefined,
		fullClientSpecifics: {
			readDirectory: () => windowsStyleLocalFiles('"new-chunk-etag"'),
		} as FullClientSpecifics<AwsProvider>,
	});

	expect(operations.toUpload).toEqual(['assets/chunk.js']);
	expect(operations.toDelete).toEqual([]);
	expect(operations.existingCount).toBe(1);
});
