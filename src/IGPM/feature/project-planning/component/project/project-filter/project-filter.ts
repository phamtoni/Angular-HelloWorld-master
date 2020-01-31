/*
 *  Copyright 2019 (c) All rights by Robert Bosch GmbH.
 *  We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Inject,
    Input,
    OnInit,
    Output,
    SimpleChanges, ViewChild,
    ViewEncapsulation
} from '@angular/core';
import {AbstractControl, FormControl, FormGroup} from "@angular/forms";
import {
    ComparisonVersion,
    CssMasterData,
    Currency,
    Project,
    ProjectPlanningContractualAgreeOTPChangeEvent,
    ProjectPlanningContractualAgreePAOChangeEvent,
    ProjectPlanningContractualSigningChangeEvent,
    ProjectPlanningEndPAOChangeEvent,
    ProjectPlanningEvent,
    ProjectPlanningOTPRateChangeEvent,
    ProjectPlanningPAORateChangeEvent,
    ProjectPlanningStartPAOChangeEvent
} from "../../../../../shared/business-domain";
import * as moment from "moment";
import {Moment} from "moment";
import {
    DateAdapter,
    MAT_DATE_FORMATS,
    MAT_DATE_LOCALE,
    MatCalendar,
    MatDatepicker,
    MatDialog,
    MatSelect
} from "@angular/material";
import {MomentDateAdapter} from "@angular/material-moment-adapter";
import {MessageDialogComponent} from "../../../../../shared/dialog";
import {DataPickerComponent, GenericValueItem} from "../../../../../shared/data-picker";
import {
    DATE_FORMATS,
    INVOICE_CUSTOMER_ENDPOINT,
    InvoiceCustomer,
    MONTH_FORMAT,
    SPECIAL_COMPANY_CODE_ENDPOINT,
    SpecialSalesCompany,
    convertToNumber,
    isValidIntegerNumber,
    isValidFloatNumber,
    getValueFromPasteEvent,
    transformNumberLocale,
    BROWSER_LOCALE,
    getDecimalSeparator,
    transformFloatNumberLocale,
    OTP_PAO_RATE_FORMAT_ERROR_MESSAGE_POINT_SEPARATOR,
    OTP_PAO_RATE_FORMAT_ERROR_MESSAGE_COMMA_SEPARATOR,
    LocaleNumberPipe,
    convertToFloatNumber,
    convertToIntegerNumber,
} from "../../../../../shared";
import * as MESSAGES from "../../../../../shared/constants/messages.constant";
import {SubprojectEducationalMessage} from "../../../../../shared/business-domain/project-planning/subproject/subproject-educational-message.enum";
import {SubprojectMessage} from "../../../../../shared/business-domain/project-planning/subproject/subproject-message";
import {DatePickerHeaderComponent} from "@igpm/core";


@Component({
    selector: 'css-project-filter',
    templateUrl: './project-filter.component.html',
    styleUrls: ['./project-filter.component.scss','../project.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [
        {provide: DateAdapter, useClass: MomentDateAdapter, deps: [MAT_DATE_LOCALE]},
        {provide: MAT_DATE_FORMATS, useValue: DATE_FORMATS},
        LocaleNumberPipe
    ],
    encapsulation: ViewEncapsulation.None
})
export class ProjectFilterComponent implements OnInit {

    @ViewChild('currencySelect') currencySelect: MatSelect;

    @ViewChild('pickerStartPAO') pickerStartPAO: MatDatepicker<Moment>;

    @ViewChild('pickerEndPAO') pickerEndPAO: MatDatepicker<Moment>;

    @ViewChild('pickerSigningContract') pickerSigningContract: MatDatepicker<Moment>;

    /**
     * Datepicker header
     */
    monthHeader = DatePickerHeaderComponent;
    yearHeader = DatePickerHeaderComponent;

    /**
     * FormControl for start PAO date field.
     */
    startPAODate = new FormControl(moment());

    /**
     * FormControl for end PAO date field.
     */
    endPAODate = new FormControl(moment());

    startPAO = new FormControl();

    /**
     * FormControl for Contract Signing date date field.
     */
    contractSigningDate = new FormControl(moment());

    /**
     * Variable used to display start PAO in format of MM/YYYY.
     */
    startPAOValue:string;

    /**
     * Variable used to display end PAO in format of MM/YYYY.
     */
    endPAOValue:string;

    /**
     * FormGroup contains all fields in form.
     */
    @Input() modelFormGroup: FormGroup;

    /**
     * Event used to emit for OTP rate change.
     */
    otpRateChangeEvent: ProjectPlanningOTPRateChangeEvent;

    /**
     * Event used to emit for PAO rate change.
     */
    paoRateChangeEvent: ProjectPlanningPAORateChangeEvent;

    /**
     * Event used to emit for Contractual Agree PAO change.
     */
    contractualAgreePAO: ProjectPlanningContractualAgreePAOChangeEvent;

    /**
     * Event used to emit for Contractual Agree OTP change.
     */
    contractualAgreeOTP: ProjectPlanningContractualAgreeOTPChangeEvent;

    /**
     * Event used to emit for Start PAO change
     */
    startPAOChangeEvent: ProjectPlanningStartPAOChangeEvent;

    /**
     * Event used to emit for End PAO change
     */
    endPAOChangeEvent: ProjectPlanningEndPAOChangeEvent;

    /**
     * Event used to emit for Contract Signing date change
     */
    contractualSigningChangeEvent: ProjectPlanningContractualSigningChangeEvent;

    /**
     * Default value based on unicode style.
     */
    defaultValue: string = "\u2015";

    @Input() paddingStyle : string;

    /*
    * a model which have all data there
    * */
    @Input() model: any;

    /*
    * indicator to tell if component should have some extra fields
    * */
    @Input() isSubprojects: boolean;

    /**
     * Component attribute identifies comparison version ( Actuals, YAP)
     */
    @Input() comparisonVersion: ComparisonVersion;

    /**
     * Status for disabling OTP and PAO input fields
     */
    @Input() isReadOnly : boolean;

    /**
     * Flag indicates if user has write permission
     */
    @Input() hasWritePermission : boolean;

    allSubprojectCurrencies : Currency[];

    selectedSubprojectCurrencyValue: number;

    formResetRequired: boolean;

    /**
     * Ranges of years is unable to be selected
     */
    today : Date = new Date();
    maxDate : Date = new Date(this.today.getFullYear() + 100, 11,31);
    minDate : Date = new Date(this.today.getFullYear() - 101, 12,1);

    changedData : any;

    /**
     * Component attribute currency list.
     */
    @Input()
    set subprojectCurrencies(currencies: Currency[]) {
        this.allSubprojectCurrencies = currencies;
        this.selectedSubprojectCurrencyValue = this.model.currencyId;
    }

    /**
     * Attribute indicate form should reset values
     * @param value
     */
    @Input()
    set shouldResetForm(value: boolean) {
        this.formResetRequired = value;
    }

    /**
     * Component attribute emits event when input fields changed.
     */
    @Output() onInputFieldDataChanged: EventEmitter<ProjectPlanningEvent> = new EventEmitter<ProjectPlanningEvent>();

    /**
     * Component attribute emits event if there is any change on fields.
     * Emitted data will contain only changed attributes.
     */
    @Output() changeEvent: EventEmitter<any> = new EventEmitter<any>();

    /**
     * Event emits value indicates form has error.
     */
    @Output() hasErrorEvent: EventEmitter<FormGroup> = new EventEmitter<FormGroup>();

    /**
     * Event emits when form reset values
     */
    @Output() formResetEvent: EventEmitter<FormGroup> = new EventEmitter<FormGroup>();

    /**
     * Event emits when currency changed.
     */
    @Output() onSubprojectCurrencyChangedEvent: EventEmitter<any> = new EventEmitter<any>();

    /**
     * Enum member variable for accessing enum values in html file.
     */
    subprojectEM = SubprojectEducationalMessage;

    otpPAORateErrorMessage: string;

    constructor(public dialog: MatDialog,
                @Inject(BROWSER_LOCALE) private browserLocale: string,
                private pipe: LocaleNumberPipe) {
        this.monthHeader.prototype.currentPeriodClicked = function (this: {calendar: MatCalendar<any>}) {
            this.calendar.currentView = this.calendar.currentView === 'year' ? 'multi-year' : 'year';
        };

        this.yearHeader.prototype.currentPeriodClicked = function (this: {calendar: MatCalendar<any>}) {
            this.calendar.currentView = 'multi-year';
        };
    }

    ngOnInit() {
        this.startPAOValue = this.model.startPAO? this.model.startPAO.format(MONTH_FORMAT) : null;
        this.endPAOValue = this.model.endPAO? this.model.endPAO.format(MONTH_FORMAT): null;
        this.otpRateChangeEvent = new ProjectPlanningOTPRateChangeEvent(this.model);
        this.paoRateChangeEvent = new ProjectPlanningPAORateChangeEvent(this.model);
        this.contractualAgreePAO = new ProjectPlanningContractualAgreePAOChangeEvent(this.model);
        this.contractualAgreeOTP = new ProjectPlanningContractualAgreeOTPChangeEvent(this.model);
        this.startPAOChangeEvent = new ProjectPlanningStartPAOChangeEvent(this.model);
        this.endPAOChangeEvent  = new ProjectPlanningEndPAOChangeEvent(this.model);
        this.contractualSigningChangeEvent = new ProjectPlanningContractualSigningChangeEvent(this.model);

        if (this.model instanceof CssMasterData) {
            this.changedData = new CssMasterData();
            this.changedData.cssSubProjectID = this.model.cssSubProjectID;
            this.changedData.invoiceCustomer =  this.model.invoiceCustomer;
            this.changedData.specialSaleCompCode =  this.model.specialSaleCompCode;
            this.changedData.updDate = this.model.updDate;
        } else if(this.model instanceof Project) {
            this.changedData = new Project();
        }

        this.otpPAORateErrorMessage = getDecimalSeparator() === '.' ? OTP_PAO_RATE_FORMAT_ERROR_MESSAGE_POINT_SEPARATOR : OTP_PAO_RATE_FORMAT_ERROR_MESSAGE_COMMA_SEPARATOR;

        this.bindDataToFormControls();
        this.setDefaultValue();
    }

    ngAfterViewInit(){
        if(this.formResetRequired && this.modelFormGroup) {
            this.modelFormGroup.reset();
            this.formResetEvent.emit(this.modelFormGroup);
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        this.startPAOValue = this.model.startPAO? this.model.startPAO.format(MONTH_FORMAT) : null;
        this.endPAOValue = this.model.endPAO? this.model.endPAO.format(MONTH_FORMAT): null;
        this.otpRateChangeEvent = new ProjectPlanningOTPRateChangeEvent(this.model);
        this.paoRateChangeEvent = new ProjectPlanningPAORateChangeEvent(this.model);
        this.contractualAgreePAO = new ProjectPlanningContractualAgreePAOChangeEvent(this.model);
        this.contractualAgreeOTP = new ProjectPlanningContractualAgreeOTPChangeEvent(this.model);
        this.startPAOChangeEvent = new ProjectPlanningStartPAOChangeEvent(this.model);
        this.endPAOChangeEvent  = new ProjectPlanningEndPAOChangeEvent(this.model);
        this.contractualSigningChangeEvent = new ProjectPlanningContractualSigningChangeEvent(this.model);

        this.markFormGroupTouched();
        this.bindDataToFormControls();
        this.hasErrorEvent.emit(this.modelFormGroup);
    }

    /**
     * Function handles start PAO date change and format selected date value
     * and display value in MM/YYYY.
     * @param date
     * @param datepicker
     */
    startPAODateChanged(date: Moment, datepicker: MatDatepicker<Moment>) {
        datepicker.close();
        this.startPAOValue = date.format(MONTH_FORMAT);
        let convertedDate = date.endOf('month');
        this.model.startPAO = moment(convertedDate);
        this.changedData.startPAO = this.model.startPAO;

        //this event should only be triggered in project level
        if(!this.isSubprojects) {
            this.showConfirmDialog(MESSAGES.START_PAO_OVERWRITE_MESSAGE).subscribe(
                (confirmed:boolean) => {
                    if (confirmed) {
                        const event: ProjectPlanningStartPAOChangeEvent = new ProjectPlanningStartPAOChangeEvent(this.model);
                        this.onInputFieldDataChanged.emit(event);
                    }
                    this.startPAOValue = null;
                    this.modelFormGroup.controls['startPAO'].reset();
                    this.model['startPAO'] = null;
                }
            )
        } else {
            this.changeEvent.emit(this.changedData);
        }
    }

    /**
     * Function handles end PAO date change and format selected date value
     * and display value in MM/YYYY.
     * @param date
     * @param datepicker
     */
    endPAODateChanged(date: Moment, datepicker: MatDatepicker<Moment>) {
        datepicker.close();
        this.endPAOValue = date.format(MONTH_FORMAT);
        let convertedDate = date.endOf('month');
        this.model.endPAO = moment(convertedDate);
        this.changedData.endPAO = this.model.endPAO;

        if(!this.isSubprojects) {
            this.showConfirmDialog(MESSAGES.END_PAO_OVERWRITE_MESSAGE).subscribe( (confirmed: boolean) => {
                if(confirmed) {
                    const event: ProjectPlanningEndPAOChangeEvent = new ProjectPlanningEndPAOChangeEvent(this.model);
                    this.onInputFieldDataChanged.emit(event);
                }
                this.endPAOValue = null;
                this.modelFormGroup.controls['endPAO'].reset();
                this.model['endPAO'] = null;
            })
        } else {
            this.changeEvent.emit(this.changedData);
        }
    }

    get yearOfContractSigning() {
        return moment().year(this.model.contractSigning);
    }

    /**
     * Function handles Contract Signing Date change.
     * @param args
     */
    contractSigningDateChanged(date: Moment, datepicker: MatDatepicker<Moment>) {
        datepicker.close();
        this.model.contractSigning = date.year();
        this.changedData.contractSigning = this.model.contractSigning;

        if (!this.isSubprojects) {
            this.showConfirmDialog(MESSAGES.CONTRACT_SINGING_OVERWRITE_MESSAGE).subscribe((confirmed: boolean) => {
                if (confirmed) {
                    const event: ProjectPlanningContractualSigningChangeEvent = new ProjectPlanningContractualSigningChangeEvent(this.model);
                    this.onInputFieldDataChanged.emit(event);
                }
                this.model.contractSigning = null;
                this.modelFormGroup.controls['contractSigning'].reset();
                this.model['contractSigning'] = null;
            })
        } else {
            this.changeEvent.emit(this.changedData);
        }
    }

    /**
     * Function handles when value of input fields change.
     * @param event
     */
    dataValueChanged(event: ProjectPlanningEvent, control: AbstractControl, domeEvent?: any) {
        this.hasErrorEvent.emit(this.modelFormGroup);
        if (!control.valid) {
            return;
        }
        this.updateDataModel(control.value,event);
        if (!this.isSubprojects) {
            let message = '';
            let resetValue = null;
            if (event instanceof ProjectPlanningPAORateChangeEvent) {
                message = MESSAGES.PAO_OVERWRITE_MESSAGE;
            } else if (event instanceof ProjectPlanningOTPRateChangeEvent) {
                message = MESSAGES.OTP_OVERWRITE_MESSAGE;
            } else if (event instanceof ProjectPlanningContractualAgreePAOChangeEvent) {
                message = MESSAGES.CONTRACTUAL_PAO_OVERWRITE_MESSAGE;
            } else if (event instanceof ProjectPlanningContractualAgreeOTPChangeEvent) {
                message = MESSAGES.CONTRACTUAL_OTP_OVERWRITE_MESSAGE;
            } else if (event instanceof ProjectPlanningStartPAOChangeEvent) {
                message = MESSAGES.START_PAO_OVERWRITE_MESSAGE;
                this.model.startPAO = !!this.startPAOValue ? this.getDateFromStringValue(this.startPAOValue) : null;
            } else if (event instanceof ProjectPlanningEndPAOChangeEvent) {
                message = MESSAGES.END_PAO_OVERWRITE_MESSAGE;
                this.model.endPAO = !!this.endPAOValue ? this.getDateFromStringValue(this.endPAOValue) : null;
            } else if (event instanceof ProjectPlanningContractualSigningChangeEvent) {
                message = MESSAGES.CONTRACT_SINGING_OVERWRITE_MESSAGE;
            }
            if (!!control.value) {
                this.showConfirmDialog(message).subscribe((confirmed: boolean) => {
                    if (confirmed) {
                        this.onInputFieldDataChanged.emit(event);
                        this.resetInputField(control, resetValue);
                    } else {
                        this.resetInputField(control, resetValue);
                        this.model[event.name] = null;
                    }
                })
            }
        } else {
            this.onInputFieldDataChanged.emit(event);
        }

        this.formatValueToNumberLocale(domeEvent);
    }

    /**
     * Function handles when subproject currency changed.
     */
    onCurrencyChanged(selectedOption: number) {
        const event: any = {currencyId: selectedOption};
        this.selectedSubprojectCurrencyValue =  selectedOption;
        this.modelFormGroup.controls['selectedCurrencyValue'].setValue(this.selectedSubprojectCurrencyValue);
        this.hasErrorEvent.emit(this.modelFormGroup);
        this.onSubprojectCurrencyChangedEvent.emit(event);
    }

    /**
     * Function detects changes on input fields and
     * emit event if there is any change.
     * @param args
     */
    inputValueChanged(args: any) {
        let value = args.target.value;

        if (value) {
            if (args.target.name == 'startPAO' || args.target.name == 'endPAO') {
                let date = this.getDateFromStringValue(value);
                if (date) {
                    this.changedData[args.target.name] = date;
                    this.changeEvent.emit(this.changedData);
                }
            } else if (value && isValidIntegerNumber(value) && !(args.target.name == 'otpRate' || args.target.name == 'paoRate')) {
                let numberValueTransformed = transformNumberLocale(value);
                let numberValue = Number(numberValueTransformed);
                this.changedData[args.target.name] = numberValue;
                this.model[args.target.name] = numberValue;
                this.changeEvent.emit(this.changedData);
            } else if (value && isValidFloatNumber(value) && (args.target.name == 'otpRate' || args.target.name == 'paoRate')) {
                let numberValueTransformed = transformFloatNumberLocale(value);
                let numberValue = Number(numberValueTransformed);
                this.model[args.target.name] = numberValue;
                if (numberValue >= 0) {
                    this.changedData[args.target.name] = numberValue;
                    this.changeEvent.emit(this.changedData);
                }
            }
        } else {
            this.changedData[args.target.name] = value == "" ? null : value;
            this.model[args.target.name] = null;
            this.changeEvent.emit(this.changedData);
        }
    }

    /**
     * Formats value as number locale and sets value back to the innput field.
     * @param args
     */
    formatValueToNumberLocale(args: any) {
        let value = args?  args.target.value : null;
        if (value) {
            if (value && isValidIntegerNumber(value) && !(args.target.name == 'otpRate' || args.target.name == 'paoRate')) {
                let numberValue = convertToIntegerNumber(value);
                args.target.value = this.pipe.transform(numberValue,'1.0-0');
            } else if (value && isValidFloatNumber(value) && (args.target.name == 'otpRate' || args.target.name == 'paoRate')) {
                let numberValue = convertToFloatNumber(value);
                if (numberValue >= 0) {
                    args.target.value = this.pipe.transform(numberValue,'1.0-1');
                }
            }
        }
    }

    /**
     * Function converts pasted text to number if valid.
     * Otherwise, original text will be displayed .
     * @param args
     */
    inputValuePasted(args) {
        let pastedData = getValueFromPasteEvent(args);
        let numberValue = convertToNumber(pastedData);
        this.changedData[args.target.name] = !!numberValue ? numberValue : pastedData;
        this.model[args.target.name] = !!numberValue ? numberValue : pastedData;
        this.modelFormGroup.controls[args.target.name].setValue( !!numberValue ? numberValue : pastedData);
        this.modelFormGroup.controls[args.target.name].markAsTouched({ onlySelf: true });
        this.changeEvent.emit(this.changedData);
    }

    /**
     * Handles when Enter key is pressed.
     * @param event
     */
    onKeydown(event) {
        if (event.key === "Enter") {
            event.target.blur();
        }
    }

    /**
     * Function creates date object from string value in format of MM.YYYY
     * @param value
     */
    private getDateFromStringValue(value : string) {
        let date  = moment(value, 'MM.YYYY');
        let convertedDate = date.endOf('month').hour(0).minute(0).second(0).millisecond(0);
        return moment(convertedDate);
    }

    /**
     * Function shows confirmation dialog with input message.
     * @param message
     */
    private showConfirmDialog(message : string) {
        const dialog = this.dialog.open(MessageDialogComponent, {
            data: {
                dialogType: 'Warning Dialogue',
                msg: message,
                okBtn: true,
                okBtnMsg: "Yes",
                cancelBtn: true,
                cancelMsg: "No"
            },
            disableClose: true
        });
        return dialog.afterClosed();
    }

    private resetInputField(control: AbstractControl, value:any) {
        control.setValue(value);
    }

    /**
     * Function open pop-up from data picker component to get Special Sale Companies.
     */
    dataPickerForCompany(dataModel: CssMasterData) {
        const dialogRef = this.dialog.open(DataPickerComponent, {
            data: {dialogName: 'Special Sales Company Code', endpoint: SPECIAL_COMPANY_CODE_ENDPOINT, comparisonVersionId: null},
        });
        dialogRef.componentInstance.onAdd.subscribe((data : GenericValueItem) => {
            let nameAndCode = data.shortName + ' (' + data.code + ')';
            let specialSaleCompCode = new SpecialSalesCompany(data.id, nameAndCode);
            this.modelFormGroup.controls['specialSaleCompCode'].setValue(specialSaleCompCode.name);
            this.changedData.specialSaleCompCode = specialSaleCompCode;
            this.hasErrorEvent.emit(this.modelFormGroup);
            this.changeEvent.emit(this.changedData);
        });
        dialogRef.afterClosed().subscribe();
    }

    /**
     * Function open pop-up from data picker component to get Invoice Customer.
     */
    dataPickerForInvoiceCustomer(dataModel: CssMasterData) {
        const dialogRef = this.dialog.open(DataPickerComponent, {
            data: {dialogName: 'Invoice Customer', endpoint: INVOICE_CUSTOMER_ENDPOINT, comparisonVersionId: this.comparisonVersion.compId}
        });

        dialogRef.componentInstance.onAdd.subscribe((data : GenericValueItem) => {
            let nameAndCode = data.shortName + ' (' + data.code + ')';
            let invoiceCustomerObj = new InvoiceCustomer(data.id, nameAndCode);
            this.modelFormGroup.controls['invoiceCustomer'].setValue(invoiceCustomerObj.name);
            this.changedData.invoiceCustomer =  invoiceCustomerObj;
            this.hasErrorEvent.emit(this.modelFormGroup);
            this.changeEvent.emit(this.changedData);
        });
        dialogRef.afterClosed().subscribe();
    }

    /**
     * Function get currency code by currency id.
     * @param curId
     */
    getCurrencyCode(curId: number) : string {
        let curCode = '\u2015';
        if(this.allSubprojectCurrencies) {
            let currency = this.allSubprojectCurrencies.find(cur => cur.curId == curId);
            if (currency) {
                curCode = currency.code;
            }
        }
        return curCode;
    }


    /**
     * Function set default value when fields are null/empty.
     */
    private setDefaultValue() {
        if(!this.startPAOValue && this.isReadOnly) {
            this.startPAOValue = this.defaultValue;
        }
        if(!this.endPAOValue && this.isReadOnly) {
            this.endPAOValue = this.defaultValue;
        }
    }
    /**
     * Set value for Invoice Customer/Special Sales Customer.
     * @param data
     */
    getDisplayValue(data : any){
        let result : string;
        if (!data || (!data.id && !data.name)) {
            return null;
        } else if (data) {
            if (!data.id) {
                return null;
            }
            if (!data.name) {
                data.name = this.defaultValue;
            }
            result = data.name;
        }
        return result;
    }

    /**
     * Sets the educational messages on subproject level based the enum.
     * @param subprojectEM enum for subproject educational messages.
     */
    getEMText(subprojectEM: SubprojectEducationalMessage) : string {
        let subprojectMessage = new SubprojectMessage;
        return subprojectMessage.getMessageText(subprojectEM);
    }

    /**
     * Manually binds data to form controls which are required
     * and shows error message if value is null.
     */
    private bindDataToFormControls() {
        if(this.modelFormGroup && this.modelFormGroup.controls['specialSaleCompCode']) {
            this.modelFormGroup.controls['specialSaleCompCode'].setValue(this.getDisplayValue(this.model.specialSaleCompCode));
            this.modelFormGroup.controls['specialSaleCompCode'].markAsTouched({ onlySelf: true });
        }

        if( this.modelFormGroup && this.modelFormGroup.controls['invoiceCustomer']){
            this.modelFormGroup.controls['invoiceCustomer'].setValue(this.getDisplayValue(this.model.invoiceCustomer));
            this.modelFormGroup.controls['invoiceCustomer'].markAsTouched({ onlySelf: true });
        }

        if( this.modelFormGroup && this.modelFormGroup.controls['selectedCurrencyValue']){
            this.modelFormGroup.controls['selectedCurrencyValue'].setValue(this.model.currencyId);
            this.modelFormGroup.controls['selectedCurrencyValue'].markAsTouched({ onlySelf: true });
        }
    }

    private markFormGroupTouched() {
        Object.values(this.modelFormGroup.controls).forEach(control => {
            control.markAsTouched();
        });
    }

    private updateDataModel(value: string,event: ProjectPlanningEvent) {
        this.convertRateValueToLocaleNumber(value,event);
    }

    private convertRateValueToLocaleNumber(value: string,event: ProjectPlanningEvent  ) {
        if (value && isValidFloatNumber(value) && (event instanceof ProjectPlanningPAORateChangeEvent || event instanceof ProjectPlanningOTPRateChangeEvent)) {
            let numberValueTransformed = transformFloatNumberLocale(value);
            let numberValue = Number(numberValueTransformed);
            this.model[event.name] = numberValue;
        }
    }
}
