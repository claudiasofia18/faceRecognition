import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { WebcamImage } from './modules/webcam/domain/webcam-image';
import { WebcamUtil } from './modules/webcam/util/webcam.util';
import { WebcamInitError } from './modules/webcam/domain/webcam-init-error';
import { FaceApiService } from './face-api.service';
import * as _ from 'lodash';
import * as faceapi from "face-api.js"
import $ from "jquery"
import { VideoPlayerService } from './video-player.service';

@Component({
  selector: 'appRoot',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {
  @ViewChild("overlay") canvas: ElementRef
  public width = 800
  public height = 800

  private cx: CanvasRenderingContext2D
  @ViewChild("inputImg") myImg: ElementRef
  public showWebcam = true;
  public allowCameraSwitch = true;
  public multipleWebcamsAvailable = false;
  public deviceId: string;
  public facingMode: string = 'environment';
  public messages: any[] = [];
  public cutImage: any
  // latest snapshot
  public webcamImage: WebcamImage = null;
  listEvents: Array<any> = [];
  public image: any
  modelsReady: boolean;
  // webcam snapshot trigger
  private trigger: Subject<void> = new Subject<void>();
  // switch to next / previous / specific webcam; true/false: forward/backwards, string: deviceId
  private nextWebcam: Subject<boolean | string> = new Subject<boolean | string>();
  constructor(
    private faceApiService: FaceApiService,
    private renderer2: Renderer2,
    private elementRef: ElementRef,
    private videoPlayer: VideoPlayerService
  ) { }

  public ngOnInit(): void {
    const observer1$ = this.faceApiService.cbModels.subscribe(res => {
      //: TODO Los modelos estan ready!!
      this.modelsReady = true;

    });
    const observer2$ = this.videoPlayer.cbAi
      .subscribe(({ faceImage }) => {
        console.log(faceImage)
        /*  const cutCanvas = this.canvas.nativeElement
          this.cx = cutCanvas.getContext("2d")
          cutCanvas.width = this.width
          cutCanvas.height = this.height
  
          this.renderer2.appendChild(cutCanvas,  faceImage)*/
        
        faceapi.matchDimensions(this.canvas.nativeElement, this.myImg.nativeElement)
        $('#facesContainer').empty()
        faceImage.forEach(canvas => $('#facesContainer').append(canvas))
      });

    this.listEvents = [observer1$, observer2$];

  }

  ngOnDestroy(): void {
    this.listEvents.forEach(event => event.unsubscribe());
  }


  public triggerSnapshot() {
    this.trigger.next()

  }
  async updateResults() {
    await this.videoPlayer.getLandMark(this.myImg);

  }

  public toggleWebcam(): void {
    this.showWebcam = !this.showWebcam;
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
  public showNextWebcam(directionOrDeviceId: boolean | string): void {
    // true => move forward through devices
    // false => move backwards through devices
    // string => move to device with given deviceId
    this.nextWebcam.next(directionOrDeviceId);
  }

  public async handleImage(webcamImage: WebcamImage): Promise<void> {
    this.addMessage('Received webcam image');
    this.webcamImage = webcamImage;
    const image = await faceapi.fetchImage(this.webcamImage.imageAsDataUrl)
    this.myImg.nativeElement.src = image.src
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

  public get nextWebcamObservable(): Observable<boolean | string> {
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


