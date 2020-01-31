/*
 *  Copyright 2019 (c) All rights by Robert Bosch GmbH.
 *  We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DomSanitizer} from "@angular/platform-browser";
import {
    ComparisonVersion,
    ComparisonVersions,
    ComparisonVersionType,
    Currency,
    Project,
    ProjectPlanningComparisonVersionChangeEvent,
    ProjectPlanningCurrencyChangeEvent,
    ProjectPlanningDiscardEvent,
    ProjectPlanningEvent,
    ProjectPlanningSaveEvent
} from "../../../../../shared/business-domain";
import {MatSelectChange} from "@angular/material";
import * as MESSAGES from "../../../../../shared/constants/messages.constant";

@Component({
    selector: 'css-project-info',
    templateUrl: './project-info.component.html',
    styleUrls: ['./project-info.component.scss', '../project.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectInfoComponent implements OnInit {

    /**
     * Array contains all currency codes.
     */
    allCurrencies: Currency[];

    /**
     * Array contains all comparison versions.
     */
    comparisonVersions: ComparisonVersion [] = ComparisonVersions;

    /**
     * Variable used to hold selected comparison version.
     */
    selectedComparisonValue: number = this.comparisonVersions[0].compId;

    selectedCurrencyValue: number;

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

    /**
     * Arrays contains subproject errors
     */
    subprojectErrors: string[];

    rateNotFoundErrorMessages: string [] = [MESSAGES.PROJECT_EX_RATE_NOT_FOUND];

    @Input()
    set buttonsAccess(access: boolean){
        this.areButtonsAvailable = access;
    }

    @Input()
    set buttonsDisabled(disabled: boolean){
        this.areButtonsDisabled = disabled;
    }

    @Input() set approvalButtonVisible(value: boolean) {
        this.isApprovalButtonVisible = value;
    }

    @Input() set approvalButtonDisabled(value: boolean) {
        this.isApprovalButtonDisabled = value;
    }


    @Input()
    set hasErrors(errors: string[]){
        this.subprojectErrors = errors;
    }

    @Input() isMonthlyRateMissing: boolean;

    constructor(public domSanitizer: DomSanitizer) {
    }

    ngOnInit() {
    }

    /**
     * Component attribute contains project data.
     */
    @Input() project: Project;

    @Input() set comparisonVersion( version : ComparisonVersion)  {
        this.selectedComparisonValue = version.compId;
    }

    /**
     * Component attribute contains currency list.
     * @param currencies
     */
    @Input()
    set currencies(currencies: Currency[]) {
        this.allCurrencies = currencies;
        this.selectedCurrencyValue = this.project.selectedCurrency.curId;
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
     * Event emits when comparison version changed.
     */
    @Output() onComparisonChangedEvent: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     * Event emits when currency changed.
     */
    @Output() onCurrencyChangedEvent: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     * Function handles when discard button is clicked.
     */
    onDiscardButtonClicked() {
        const discardEvent = new ProjectPlanningDiscardEvent(this.project);
        this.onDiscardClickedEvent.emit(discardEvent);
    }

    /**
     * Function handles when save button is clicked.
     */
    onSaveButtonClicked() {
        const saveEvent = new ProjectPlanningSaveEvent(this.project);

        this.onSaveClickedEvent.emit(saveEvent);
    }

    /**
     * Function handles when approval button is clicked.
     */
    onApprovalButtonClicked() {
        const event = new ProjectPlanningSaveEvent(this.project);
        this.onApprovalClickedEvent.emit(event);
    }

    /**
     * Function handles when comparison version changed.
     * @param args
     */
    onComparisonVersionChanged(args: MatSelectChange) {
        let selectedComparisonVersion = this.comparisonVersions.find(comp => comp.compId === this.selectedComparisonValue);
        this.project.originalComparisonVersion = this.project.selectedComparisonVersion;
        this.project.selectedComparisonVersion = selectedComparisonVersion;
        const event: ProjectPlanningComparisonVersionChangeEvent = new ProjectPlanningComparisonVersionChangeEvent(this.project);
        this.onComparisonChangedEvent.emit(event);
    }

    /**
     * Function handles when currency changed.
     */
    onCurrencyChanged() {
        let selectedCurrency = this.allCurrencies.find(currency => currency.curId === this.selectedCurrencyValue);
        this.project.selectedCurrency = selectedCurrency;
        this.onCurrencyChangedEvent.next(new ProjectPlanningCurrencyChangeEvent(this.project));
    }

    /**
     * Returns true if actual version is selected.
     */
    get isActualVersionSelected() : boolean {
        return this.project.selectedComparisonVersion.compId == ComparisonVersionType.ACTUAL
    }
}
