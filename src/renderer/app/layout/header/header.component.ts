import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { BaseComponent } from '@renderer/app/base.component';
import { UpdateEnum } from '@renderer/enum/update.enum';
import { PackageUtils } from '@renderer/utils/package.utils';
import { StringUtils } from '@renderer/utils/string.utils';
import { ipcRenderer, shell } from 'electron';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent extends BaseComponent implements OnInit {
  version: string = PackageUtils.get('version');
  update = UpdateEnum;
  latestVersionInfo: any;
  updateResponse: any;
  percentage = 0;
  releaseNotes: string;

  constructor(private ref: ChangeDetectorRef) {
    super();
    this.handlerUpdate(true);
  }

  ngOnInit() {
  }

  handlerDirectGitHub() {
    shell.openExternal('https://github.com/EdurtIO/dbm');
  }

  handlerUpdate(flag: boolean) {
    this.updateResponse = null;
    if (flag) {
      this.dialog.update = true;
      this.loading.button = true;
      ipcRenderer.send('check-update');
      this.handlerUpdateState();
    } else {
      this.dialog.update = false;
    }
  }

  handlerDownload() {
    ipcRenderer.send('confirm-downloadUpdate');
    this.handlerUpdateState();
  }

  handlerCancel() {
    ipcRenderer.send('confirm-downloadCancel');
    this.handlerUpdateState();
  }

  handlerUpdateState() {
    ipcRenderer.on('updater', (event, arg) => {
      this.loading.button = false;
      this.ref.markForCheck();
      this.ref.detectChanges();
      switch (arg.state) {
        case UpdateEnum.hasversion:
          if (StringUtils.isNotEmpty(arg)) {
            this.latestVersionInfo = arg.message;
          }
          this.releaseNotes = arg?.message?.releaseNotes;
          break;
        case UpdateEnum.downloading:
          this.disabled.button = false;
          this.percentage = arg.message.percent.toFixed(2);
          break;
        case UpdateEnum.completed:
          console.log('download success!');
          ipcRenderer.send('confirm-update');
          this.disabled.button = true;
          break;
        case UpdateEnum.noversion:
          this.loading.button = true;
          this.loading.button = false;
          console.log('no version', arg)
          break;
        case UpdateEnum.cancel:
          console.log('cancel download', arg)
          this.disabled.button = true;
          break;
        default:
          this.updateResponse = arg;
          this.disabled.button = true;
          break;
      }
    })
  }
}
