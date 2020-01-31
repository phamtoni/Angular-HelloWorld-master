/*
 * Copyright 2018. (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {Component, EventEmitter, Inject, Input, OnInit, Output} from '@angular/core'
import {
    ComparisonVersion,
    CssMasterData,
    Currency,
    ProjectPlanningCurrencyChangeEvent,
    SubProjectVersion
} from "../../../../../../shared/business-domain";
import {DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE, MatDialog} from "@angular/material";
import {MomentDateAdapter} from "@angular/material-moment-adapter";
import {
    DATE_FORMATS,
    MONTH_FORMAT,
    YEAR_FORMAT,
    BROWSER_LOCALE,
    dateValidator,
    validateDateRange,
    isRequiredValue,
    NumberFormatValidators,
} from "../../../../../../shared";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import * as moment from "moment";

@Component({
    selector: 'css-css-master-data',
    templateUrl: './css-master-data.component.html',
    styleUrls: ['./css-master-data.component.scss'],
    providers: [
        {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
        {provide: MAT_DATE_FORMATS, useValue: DATE_FORMATS},
    ],
})
export class CssMasterDataComponent implements OnInit {

    constructor(private dialog: MatDialog,
                private formBuilder: FormBuilder,
                @Inject(BROWSER_LOCALE) private browserLocale: string) {}
    cssMasterDataObj: CssMasterData;

    @Input() set cssMasterData(data : CssMasterData) {
        this.cssMasterDataObj = !!data ? data : new CssMasterData();
    }

    /**
     * Component attribute identifies comparison version ( Actuals, YAP)
     */
    @Input() comparisonVersion: ComparisonVersion;

    @Input() set subprojectVersion(data: SubProjectVersion){
        if (this.comparisonVersion) {
            this.cssMasterData = data.versionSubprojectMap.get(this.comparisonVersion.compId).cssMasterData;
        }
    }

    /**
     * Component attribute currency list.
     */
    @Input() currencies: Currency[];

    /**
     *  Event emits when project data changed by updating input fields.
     */
    @Output() dataModelChangedEvent: EventEmitter<any> = new EventEmitter<any>();

    @Output() onChangeEvent: EventEmitter<any> = new EventEmitter<any>();

    @Output() onInputFieldDataChangedEvent: EventEmitter<any> = new EventEmitter<any>();

    /**
     * Event emits value indicates form has error.
     */
    @Output() hasErrorEvent: EventEmitter<FormGroup> = new EventEmitter<FormGroup>();

    /**
     * Event emits when currency changed.
     */
    @Output() onSubprojectCurrencyChangedEvent: EventEmitter<ProjectPlanningCurrencyChangeEvent> = new EventEmitter<ProjectPlanningCurrencyChangeEvent>();

    modelFormGroup: FormGroup;

    /**
     * Status for disabling OTP and PAO input fields
     */
    @Input() isReadOnly: boolean;

    /**
     * Flag indicates if user has write permission
     */
    @Input() hasWritePermission: boolean;

    public get hasError(): boolean {
        return this.modelFormGroup.invalid;
    }

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
            'contractSigning': ['',[  dateValidator(YEAR_FORMAT), Validators.min(minYear), Validators.max(maxYear)]],
            'invoiceCustomer': ['',[Validators.required]],
            'specialSaleCompCode':  ['',[Validators.required]],
            'selectedCurrencyValue': ['',[Validators.required]],

        },{ validators: isRequiredValue('contractSigning', 'contractualPAO', 'contractualOTP'),
            updateOn: 'blur'});
    }

    /**
     * Function handles when subproject project data changed.
     * @param event
     */
    onInputFieldDataChanged(event: any) {
        this.onInputFieldDataChangedEvent.emit(event);
    }

    dataModelChanged(event: any) {
        this.dataModelChangedEvent.emit(event);
    }

    /**
     * Function handles currency change
     */
    onSubprojectCurrencyChanged(event: ProjectPlanningCurrencyChangeEvent) {
        this.onSubprojectCurrencyChangedEvent.emit(event);
    }

    onValueChanged(event: any) {
        this.onChangeEvent.emit(event);
    }

    onError(formGroup: FormGroup) {
        this.hasErrorEvent.emit(formGroup);
    }
}
