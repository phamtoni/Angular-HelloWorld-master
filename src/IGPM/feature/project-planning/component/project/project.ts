/*
 *  Copyright 2019 (c) All rights by Robert Bosch GmbH.
 *  We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {
    ChangeDetectionStrategy,
    Component,
    ElementRef,
    EventEmitter,
    Inject,
    Input,
    OnInit,
    Output,
    ViewChild
} from '@angular/core';
import {
    Currency,
    Project,
    ProjectErrorEvent,
    ProjectPlanningDiscardEvent,
    ProjectPlanningEvent,
    ProjectPlanningSaveEvent,
    ProjectValue
} from "../../../../shared/business-domain";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {
    MONTH_FORMAT,
    ReadWriteHelper,
    YEAR_FORMAT,
    validateDateRange,
    dateValidator,
    NumberFormatValidators,
    BROWSER_LOCALE,
} from "../../../../shared";

import * as moment from "moment";
import {BehaviorSubject, Observable, Subject} from "rxjs";
import {takeWhile} from "rxjs/operators";

@Component({
    selector: 'css-project',
    templateUrl: './project.component.html',
    styleUrls: ['./project.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectComponent implements OnInit {

    /**
     * Variable for show more label.
     */
    private readonly showMoreLabel = "Show more";

    /**
     * Variable for show less label.
     */
    private readonly showLessLabel = "Show less";

    /**
     * A flag indicates show or hide project value table.
     */
    public showDetailVisible : boolean = false;

    /**
     * Variable for show more/show less button.
     */
    private toogleButtonLabel: string = this.showMoreLabel;

    /**
     * Data source for project value table.
     */
    public dataSource : ProjectValue[];

    /**
     * Object contains project data.
     */
    public project: Project;

    /**
     * ViewChild binds to content element in view.
     */
    @ViewChild('content') contentElemRef: ElementRef;

    @Input() defaultMinHeight : number;

    @Input() paddingTop : number;

    @Input() actualDataSumError$:Observable<boolean>;

    modelFormGroup: FormGroup;


    /**
     * A flag indicates if observable can be subscribed.
     */
    canSubscribe: boolean = true;

    constructor(public elementRef: ElementRef,
                private formBuilder: FormBuilder,
                private readWriteHelper: ReadWriteHelper,
                @Inject(BROWSER_LOCALE) private browserLocale: string) { }

    ngOnInit() {
        let currentYear = moment(new Date()).year();
        let minYear = currentYear - 100;
        let maxYear = currentYear + 100;
        this.modelFormGroup = this.formBuilder.group({
            'paoRate': ['', [ NumberFormatValidators.float(this.browserLocale, 1), NumberFormatValidators.min(0, this.browserLocale), NumberFormatValidators.max(999.9, this.browserLocale) ]],
            'otpRate': ['', [ NumberFormatValidators.float(this.browserLocale, 1), NumberFormatValidators.min(0, this.browserLocale), NumberFormatValidators.max(999.9, this.browserLocale) ]],
            'contractualPAO': ['',[ NumberFormatValidators.int(this.browserLocale) ]],
            'contractualOTP': ['',[ NumberFormatValidators.int(this.browserLocale) ]],
            'startPAO': ['',[ dateValidator(MONTH_FORMAT), validateDateRange(MONTH_FORMAT, minYear, maxYear)]],
            'endPAO': ['',[  dateValidator(MONTH_FORMAT), validateDateRange(MONTH_FORMAT, minYear, maxYear)]],
            'contractSigning': ['',[  dateValidator(YEAR_FORMAT), Validators.min(minYear), Validators.max(maxYear)]]

        },{updateOn: 'blur'});
    }

    ngOnDestroy() {
        this.canSubscribe = false;
    }

    /**
     *  Event emits when save button is clicked.
     */
    @Output() onSaveClickedEvent: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     *  Event emits when discard button is clicked.
     */
    @Output() onDiscardClickedEvent: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     * Event emits when approval button is clicked.
     */
    @Output() onApprovalClickedEvent: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     *  Event emits when project data changed by updating input fields.
     */
    @Output() onProjectDataChanged: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     *  Event emits when project data changed by updating input fields.
     */
    @Output() onProjectErrorEvent: EventEmitter<ProjectErrorEvent> = new EventEmitter<ProjectErrorEvent>();


    /*indicator to tell us if buttons are available*/
    areButtonsAvailable: boolean;

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
    subprojectErrors : string[];

    shouldResetForm: boolean = false;

    /**
     * Component attribute contains project data.
     * @param data
     */
    @Input()
    set projectData(data:Project) {
        this.project = data ? Object.assign(new Project(),data) : new Project();
        if (data && data.dataTable) {
            this.dataSource = Array.from(data.dataTable);
        }

        this.bindFormValuesToModel();

        if (!!data) {
            this.isApprovalButtonVisible = data.ifrsVersionId != null;
            this.isApprovalButtonDisabled =  !this.readWriteHelper.getAccessRights(data.ifrsVersionId).isWritable;
        }
    }

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
    set hasErrors(errors: Subject<string[]>){
        errors.pipe( takeWhile(() => this.canSubscribe)).subscribe(dataError => {
            this.subprojectErrors = dataError;
        })
    }

    @Input()
    set projectDiscardState(discard$: Observable<boolean>){
        if (discard$) {
            discard$.pipe( takeWhile(() => this.canSubscribe)).subscribe(isDiscarding=>{
                if(isDiscarding && this.showDetailVisible && !this.pinned){
                    this.resetForm();
                } else if(isDiscarding){
                    this.shouldResetForm = true;
                }
            })
        }
    }

    /**
     * Component attribute indicates that data is loading.
     */
    @Input() isProgressStart;

    /**
     * Component attribute currency list.
     */
    @Input() currencies: Currency[];

    /**
     * Component attribute indicates the view is pinned when scrolling.
     * When pinned is on, only the sum table & action buttons will be visible.
     */
    @Input() pinned: boolean;

    /**
     * Function shows or hide project value table.
     */
    toggleDetailsRows() {
        this.toogleButtonLabel = this.showDetailVisible ? this.showMoreLabel : this.showLessLabel;
        this.showDetailVisible = !this.showDetailVisible;
    }

    /**
     * Function handles when discard button is clicked.
     */
    onDiscardButtonClicked() {
        this.onDiscardClickedEvent.emit(new ProjectPlanningDiscardEvent(this.project));
    }

    /**
     * Function handles when approval button is clicked.
     */
    onApprovalButtonClicked() {
        const event = new ProjectPlanningSaveEvent(this.project);
        this.onApprovalClickedEvent.emit(event);
    }

    /**
     * Function handles when save button is clicked.
     */
    onSaveButtonClicked() {
        this.onSaveClickedEvent.emit(new ProjectPlanningSaveEvent(this.project));
    }

    /**
     * Function handles when project data changed.
     * @param event
     */
    onValueChanged(event: ProjectPlanningEvent) {
        this.onProjectDataChanged.emit(event);
    }

    /**
     * Function check and emit when Project Level form has any error.
     * @param event
     */
    onError(formGroup: FormGroup) {
        let error = !formGroup.valid;
        let eventData: ProjectErrorEvent = {project: this.project, error: error};
        if(!this.shouldResetForm) {
            this.onProjectErrorEvent.emit(eventData);
        }

    }

    /**
     * Handles event when form has reset values
     * @param formGroup
     */
    formResetComplete(formGroup: FormGroup){
        this.shouldResetForm = false;
    }

    /**
     * Resets values on FormGroup
     */
    private resetForm() {
        if(this.modelFormGroup) {
            this.modelFormGroup.reset();
        }
    }

    /**
     * Binds values from FormGroup to model
     */
    private bindFormValuesToModel() {
        if(this.modelFormGroup ) {

            if(this.modelFormGroup.controls["otpRate"]) {
                this.project.otpRate = this.modelFormGroup.controls["otpRate"].value;
            }

            if(this.modelFormGroup.controls["paoRate"]) {
                this.project.paoRate = this.modelFormGroup.controls["paoRate"].value;
            }

            if(this.modelFormGroup.controls["contractualPAO"]) {
                this.project.contractualPAO = this.modelFormGroup.controls["contractualPAO"].value;
            }

            if(this.modelFormGroup.controls["contractualOTP"]) {
                this.project.contractualOTP = this.modelFormGroup.controls["contractualOTP"].value;
            }

            if(this.modelFormGroup.controls["startPAO"]) {
                this.project.startPAO = this.modelFormGroup.controls["startPAO"].value;
            }

            if(this.modelFormGroup.controls["endPAO"]) {
                this.project.endPAO = this.modelFormGroup.controls["endPAO"].value;
            }

            if(this.modelFormGroup.controls["contractSigning"]) {
                const value = this.modelFormGroup.controls["contractSigning"].value;
                this.project.contractSigning = !!value ? value: null;
            }
        }
    }
}
