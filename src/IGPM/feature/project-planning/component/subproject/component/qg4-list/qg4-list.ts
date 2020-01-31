import {Component, OnInit, EventEmitter, Output, Input} from '@angular/core';
import {QG4} from "../../../../../../shared/business-domain";

@Component({
    selector: 'css-qg4-list',
    templateUrl: './qg4-list.component.html',
    styleUrls: ['./qg4-list.component.scss']
})
export class Qg4ListComponent implements OnInit {

    /**
     * Emit event to parent node for closing QG4 dialog.
     */
    @Output() onCloseClickedEvent: EventEmitter<any> = new EventEmitter<any>();
    /**
     * Contain QG4 data be fetched from backend.
     */
    @Input() qg4Array: QG4[];
    /**
     * Set loading status when QG4 data is empty.
     */
    @Input() set isQG4LoadingBinding(isQG4Loading : boolean) {
        this.isQG4Loading = isQG4Loading;
    };
    /**
     * Loading status for QG4.
     */
    isQG4Loading: boolean;

    constructor() {}

    ngOnInit() {
    }

    /**
     * Function close QG4 dialog.
     */
    onClose() {
        this.onCloseClickedEvent.emit();
    }
}
