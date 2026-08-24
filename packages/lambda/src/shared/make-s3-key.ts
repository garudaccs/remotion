import path from 'node:path';

export const toPosixRelativePath = (relativePath: string) => {
	return relativePath.split(path.sep).join('/').split(path.win32.sep).join('/');
};

export const makeS3Key = (folder: string, dir: string, filePath: string) => {
	return `${folder}/${toPosixRelativePath(path.relative(dir, filePath))}`;
};
