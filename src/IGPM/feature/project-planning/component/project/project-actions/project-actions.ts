import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {ProjectPlanningEvent} from "../../../../../shared/business-domain/project-planning/project-planning-event";

@Component({
    selector: 'css-project-actions',
    templateUrl: './project-actions.component.html',
    styleUrls: ['./project-actions.component.scss']
})
export class ProjectActionsComponent implements OnInit {

    constructor() { }

    /*
     check if buttons are available
   * */
    areButtonsAvailable:boolean;

    /**
     * Flag indicates buttons are disabled
     */
    areButtonsDisabled: boolean;

    /**
     * Flag indicates approval button is visible
     */
    isApprovalButtonVisible: boolean;

    /**
     * Flag indicates approval button is disabled
     */
    isApprovalButtonDisabled: boolean;

    @Input() set approvalButtonVisible(value: boolean) {
        this.isApprovalButtonVisible = value;
    }

    @Input() set approvalButtonDisabled(value: boolean) {
        this.isApprovalButtonDisabled = value;
    }

    /**
     * Check status of pinned
     */
    @Input() pinned: boolean;

    @Input()
    set buttonsAccess(access: boolean){
        this.areButtonsAvailable = access;
    }

    @Input()
    set buttonsDisabled(disabled: boolean){
        this.areButtonsDisabled = disabled;
    }

    ngOnInit() {
    }

    /**
     * Event emits when save button is clicked.
     */
    @Output() onSaveClickedEvent: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     * Event emits when discard button is clicked.
     */
    @Output() onDiscardClickedEvent: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     * Event emits when approval button is clicked.
     */
    @Output() onApprovalClickedEvent: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     * Function handles when discard button is clicked.
     */
    onDiscardButtonClicked() {
        this.onDiscardClickedEvent.emit();
    }

    /**
     * Function handles when approval button is clicked.
     */
    onApprovalButtonClicked() {
        this.onApprovalClickedEvent.emit();
    }

    /**
     * Function handles when save button is clicked.
     */
    onSaveButtonClicked() {
        this.onSaveClickedEvent.emit();
    }
}
