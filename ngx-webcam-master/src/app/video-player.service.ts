import {EventEmitter, Injectable} from '@angular/core';
import {FaceApiService} from './face-api.service';
import * as _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class VideoPlayerService {
  cbAi: EventEmitter<any> = new EventEmitter<any>();

  constructor(private faceApiService: FaceApiService) {

  }

  getLandMark = async (videoElement: any) => {
    const {globalFace} = this.faceApiService;
    // console.log(displaySize);
    const detectionsFaces = await globalFace.detectAllFaces(videoElement.nativeElement)
    const faceImage = await globalFace.extractFaces(videoElement.nativeElement, detectionsFaces)
    this.cbAi.emit({
      videoElement,
      faceImage
    });

  };
}
