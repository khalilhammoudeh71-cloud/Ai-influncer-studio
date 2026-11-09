export const VIDEO_UPLOAD_ACCEPT='video/*,.mp4,.mov,.webm,.mkv,.avi,.m4v,.3gp';
export function isVideoUpload(file:{type:string;name:string}):boolean{
 return file.type.startsWith('video/')||((!file.type||file.type==='application/octet-stream')&&/\.(mp4|mov|webm|mkv|avi|m4v|3gp)$/i.test(file.name));
}
