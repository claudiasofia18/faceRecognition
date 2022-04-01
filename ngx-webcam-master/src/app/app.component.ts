import {Component, ElementRef, OnInit, Renderer2, ViewChild} from '@angular/core';
import {Observable, Subject} from 'rxjs';
import {WebcamImage} from './modules/webcam/domain/webcam-image';
import {WebcamUtil} from './modules/webcam/util/webcam.util';
import {WebcamInitError} from './modules/webcam/domain/webcam-init-error';
import {FaceApiService} from './face-api.service';
import * as _ from 'lodash';
import * as faceapi from 'face-api.js';
import { FaceDetection } from 'face-api.js';
import  $ from 'jquery'
@Component({
  selector: 'appRoot',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  // toggle webcam on/off
  
  public context !: CanvasRenderingContext2D
  @ViewChild("overlay") canvas : ElementRef
  public showWebcam = true;
  public allowCameraSwitch = true;
  public multipleWebcamsAvailable = false;
  public deviceId: string;
  public facingMode: string = 'environment';
  public messages: any[] = [];

  // latest snapshot
  public webcamImage: WebcamImage = null;

  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  // switch to next / previous / specific webcam; true/false: forward/backwards, string: deviceId
  private nextWebcam: Subject<boolean|string> = new Subject<boolean|string>();
  constructor(
    private faceApiService: FaceApiService,
    private renderer2: Renderer2,
    private elementRef: ElementRef
  ) {}

  public ngOnInit(): void {
  }

  public async triggerSnapshot(): Promise<void> {
    const inputImgEl = $('#inputImg').get(0)
    const detections = await faceapi.detectAllFaces(inputImgEl)
    const faceImages = await faceapi.extractFaces(inputImgEl, detections)
    this.displayExtractedFaces(faceImages)
    
   
   
  }

  public toggleWebcam(): void {
    this.showWebcam = !this.showWebcam;
  }

 

   displayExtractedFaces(faceImages) {
    const canvas = $('#overlay').get(0)
    faceapi.matchDimensions(canvas, $('#inputImg').get(0))
    $('#facesContainer').empty()
    faceImages.forEach(canvas => $('#facesContainer').append(canvas))
    
  }

  public handleInitError(error: WebcamInitError): void {
    this.messages.push(error);
    if (error.mediaStreamError && error.mediaStreamError.name === 'NotAllowedError') {
      this.addMessage('User denied camera access');
    }
  }


  private convertToFile(webcamImage: WebcamImage) {
    const arr = webcamImage.imageAsDataUrl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const file: File = new File([u8arr], 'fotito', { type: 'image/jpeg' })
  
    return file;
  }
  public showNextWebcam(directionOrDeviceId: boolean|string): void {
    // true => move forward through devices
    // false => move backwards through devices
    // string => move to device with given deviceId
    this.nextWebcam.next(directionOrDeviceId);
  }

  public handleImage(webcamImage: WebcamImage): void {
    this.addMessage('Received webcam image');
    console.log(webcamImage);
    this.webcamImage = webcamImage;
  }

  public cameraWasSwitched(deviceId: string): void {
    this.addMessage('Active device: ' + deviceId);
    this.deviceId = deviceId;
    this.readAvailableVideoInputs();
  }

  addMessage(message: any): void {
    console.log(message);
    this.messages.unshift(message);
  }

  public get triggerObservable(): Observable<void> {
    return this.trigger.asObservable();
  }

  public get nextWebcamObservable(): Observable<boolean|string> {
    return this.nextWebcam.asObservable();
  }

  public get videoOptions(): MediaTrackConstraints {
    const result: MediaTrackConstraints = {};
    if (this.facingMode && this.facingMode !== '') {
      result.facingMode = { ideal: this.facingMode };
    }

    return result;
  }

  private readAvailableVideoInputs() {
    WebcamUtil.getAvailableVideoInputs()
      .then((mediaDevices: MediaDeviceInfo[]) => {
        this.multipleWebcamsAvailable = mediaDevices && mediaDevices.length > 1;
      });
  }
}


