/*
 * Copyright 2019. (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild} from '@angular/core';
import {
    ApprovalPermission,
    ComparisonVersion,
    CssMasterData,
    Currency,
    CurrencyRate,
    ForecastExRate,
    McrMasterData,
    Project,
    ProjectPlanningCurrencyChangeEvent,
    QG4,
    Subproject,
    SubprojectData,
    SubprojectDataChange,
    SubprojectErrorEvent,
    ApprovalDialogData,
    LastUpdatedSubProject,
    SubprojectActualData,
    ComparisonVersionType
} from "../../../../shared/business-domain";
import {McrMasterDataComponent} from "./components/mcr-master-data/mcr-master-data.component";
import {SubProjectVersion} from 'src/app/shared/business-domain';
import {SubprojectSanboxService} from "./subproject-sanbox.service";
import {BehaviorSubject, Observable, Subscription} from "rxjs";
import * as moment from "moment";
import {ReadWriteHelper} from "../../../../shared/utils";
import {convertValueToNewForecastRate} from "../../../../shared/utils/currency.helper";
import {FormGroup} from "@angular/forms";
import {CssMasterDataComponent} from "./components/css-master-data/css-master-data.component";
import {takeWhile} from "rxjs/operators";
import {ServiceErrorCode} from "../../../../shared/constants";
import * as MESSAGES from "../../../../shared/constants/messages.constant";

@Component({
    selector: 'css-subproject',
    templateUrl: './subproject.component.html',
    styleUrls: ['./subproject.component.scss']
})
export class SubprojectComponent implements OnInit {

    constructor(public elementRef: ElementRef, private sandbox: SubprojectSanboxService,
                private readWriteHelper: ReadWriteHelper) {
    }

    @ViewChild('subprojectContent') contentElemRef: ElementRef;

    @ViewChild('mcrMasterDataComponent') mcrMasterDataComponent: McrMasterDataComponent;

    @ViewChild('cssMasterDataComponent') cssMasterDataComponent: CssMasterDataComponent;

    @Input() paddingTop: number;

    @Input() approvalPermission: ApprovalPermission;

    @Output() onSubprojectCurrencyChangedEvent: EventEmitter<ProjectPlanningCurrencyChangeEvent> = new EventEmitter<ProjectPlanningCurrencyChangeEvent>();

    @Output() onSubprojectValueChangedEvent: EventEmitter<SubprojectData[]> = new EventEmitter<SubprojectData[]>();

    @Output() onChangeEvent: EventEmitter<Subproject> = new EventEmitter<Subproject>();

    @Output() onCssDataErrorEvent: EventEmitter<SubprojectErrorEvent> = new EventEmitter<SubprojectErrorEvent>();

    @Output() onSubprojectDataErrorEvent: EventEmitter<SubprojectErrorEvent> = new EventEmitter<SubprojectErrorEvent>();

    @Output() onApproveStartedEvent: EventEmitter<ApprovalDialogData> = new EventEmitter();

    /**
     * will contain the data for each subproject in list
     * */
    subproject: Subproject;

    /**
     * variable contains subproject version data.
     */
    subprojectVersion: SubProjectVersion;

    /**
     * variable contains comparison version.
     */
    comVersion: ComparisonVersion;

    /**
     * Flag indicates component is loading data.
     */
    @Input() isProgressStart: boolean;

    /**
     * Flag indicates subproject component is in read mode.
     */
    isReadOnly : boolean = false;

    /**
     * Flag indicates if user has write permission
     */
    hasWritePermission : boolean = true;

    /**
     * Flag indicates all QG4 data is loading.
     */
    isQG4Loading : boolean;

    /**
     * Array contains all subscriptions to observable.
     */
    subscriptions: Subscription[] = [];

    /**
     *  Event emits when project data changed by updating input fields.
     */
    @Output() onInputFieldDataChangedEvent: EventEmitter<any> = new EventEmitter<any>();

    /**
     * Object contains project data.
     */
    public project: Project;

    /**
     * Component attribute indicates the view is pinned when scrolling.
     * When pinned is on, only the sum table & action buttons will be visible.
     */
    @Input() pinned: boolean;

    /**
     * A flag indicates if observable can be subscribed.
     */
    canSubscribe: boolean = true;

    /**
     * Component attribute indicates the component is in visible range
     * while scrolling.
     * @param value
     */
    @Input() set isInVisibleRange (value: boolean) {
        if(value) {
            this.isContentVisible = true;
        }
    }

    /**
     * FormGroup object from css master data component.
     */
    cssMasterDataFormGroup: FormGroup;

    /**
     * Object stores changed subproject
     */
    changedSubproject:Subproject;

    /**
     * A flag for show or hide IFRS15Relevant
     */
    isIFRS15Relevant: boolean;

    /**
     * A flag indicates the component should be rendered.
     */
    isContentVisible: boolean = false;

    actualDataArrayError$:Observable<boolean>;

    subprojectActualError$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(null);

    ngOnInit() {
        this.changedSubproject = new Subproject();
        this.checkReadOnlyForOTPAndPAO(this.subproject.mcrMasterData);
        this.isIFRS15Relevant = this.sandbox.getIFRSRelevantForChangedValue(this.subproject);
        this.actualDataArrayError$ = this.sandbox.getActualDataArrayError();
    }

    ngOnDestroy() {
        this.subscriptions.forEach(subscription => subscription.unsubscribe);
        this.canSubscribe = false;
    }

    /**
     * Component attribute currency list.
     */
    @Input() currencies: Currency[];

    /**
     * Component attribute contains all currency rates by years.
     */
    @Input() yearlyCurrencyRates : CurrencyRate[];

    /**
     * Component attribute contains forecast ex rates.
     */
    @Input() forecastExRates: ForecastExRate[];

    /**
     * Component attribute contains subproject version data.
     * @param subprojectVersion
     */
    @Input()
    set subprojectItem(subprojectVersion: SubProjectVersion) {
        this.subprojectVersion = subprojectVersion ? subprojectVersion : new SubProjectVersion();
        let versionId = this.subprojectVersion.activeVersion;
        this.subproject = this.subprojectVersion.versionSubprojectMap.has(versionId) ? this.subprojectVersion.versionSubprojectMap.get(versionId) : new Subproject();
        let updatedSubproject = this.sandbox.updateProject(this.project,this.subproject);
        this.isIFRS15Relevant = this.sandbox.getIFRSRelevantForChangedValue(updatedSubproject);
        this.checkAccessRight();
    }

    /**
     * Component attribute contains project data.
     * @param data
     */
    @Input()
    set projectData(data: Project) {
        this.project = data ? data : new Project();
        this.comVersion = this.project.selectedComparisonVersion;
        this.checkAccessRight();
    }

    /**
     * Component attribute contains the array of QG4 data.
     * @param mcrPrjId
     */
    showAllQG4Clicked(mcrPrjId: number) {
        if (!this.subproject.mcrMasterData.allQG4 ||  this.subproject.mcrMasterData.allQG4.length == 0) {
            this.isQG4Loading = true;
            let qg4ListSubcription = this.sandbox.fetchAllQG4(mcrPrjId).subscribe(data => {
                this.isQG4Loading = false;
                data = data.sort((firstQg4: QG4, secondQg4: QG4) => {
                    if (moment(firstQg4.date).isBefore(moment(secondQg4.date))) {
                        return -1;
                    }
                    if (moment(firstQg4.date).isAfter(moment(secondQg4.date))) {
                        return 1;
                    }
                    return 0;
                });
                this.subproject.mcrMasterData.allQG4 = data;
            }, error => {
                this.isQG4Loading = false;
            })
            this.subscriptions.push(qg4ListSubcription);
        }
    }

    onInputFieldDataChanged(event: any) {
        this.onInputFieldDataChangedEvent.emit(event);
    }

    /**
     * function which handles currency change
     */
    onSelectedSubprojectCurrency(event: any) {
        let newCurrencyId: number = event.currencyId; // new currency

        this.sandbox.isDataLoading().pipe( takeWhile(() => this.canSubscribe)).subscribe((isLoading:boolean) => {
            this.isProgressStart = isLoading;
        });

        if (this.yearlyCurrencyRates && this.yearlyCurrencyRates.length > 0) {
            this.changeCurrency(newCurrencyId);
        } else {
            let currencies = [this.subproject.cssMasterData.currencyId,newCurrencyId];
            let currencySubcription = this.sandbox.fetchSubprojectCurrencyRates(this.subproject,currencies,this.comVersion.compId).subscribe((rates: CurrencyRate[] ) => {
                if (rates && rates.length > 0) {
                    this.yearlyCurrencyRates = rates;
                    this.changeCurrency(newCurrencyId);
                }
            });
            this.subscriptions.push(currencySubcription);
        }

        if (this.project.selectedComparisonVersion.compId == ComparisonVersionType.ACTUAL) {
            this.sandbox.fetchSubprojectActualData(this.project.prjId,this.subproject.mcrMasterData.mcrPrjId,newCurrencyId).pipe( takeWhile(() => this.canSubscribe))
                .subscribe( (data : SubprojectActualData) => {
                    this.subprojectActualError$.next(false);
                    if (!!data && data.mcrPrjId == this.subproject.mcrMasterData.mcrPrjId) {
                        this.sandbox.updateSubprojectActualData(this.subproject,[data]);
                    } else if (!data) {
                        this.sandbox.clearSubprojectActualData(this.subproject);
                    }
                    this.changeToNewCurrency(newCurrencyId);
                }, error => {
                    if(this.sandbox.isRateNotFoundError(error)) {
                        this.subprojectActualError$.next(true);
                    }
                    this.sandbox.clearSubprojectActualData(this.subproject);
                    this.changeToNewCurrency(newCurrencyId);
                });
        }
    }

    /**
     * Handles error when input fields are invalid.
     * @param value
     */
    onCssValueHasError(formGroup: FormGroup) {
        this.cssMasterDataFormGroup = formGroup;
        let error = !formGroup.valid;
        let eventData : SubprojectErrorEvent = {subproject: this.subproject, error: error};
        this.onCssDataErrorEvent.emit(eventData);
    }

    /**
     * Funtion updates subproject with CssMasterData and mcrMasterData
     * and emit data subscriber.
     * @param data
     */
    onCssValueChanged(data : CssMasterData) {
        this.changedSubproject.mcrMasterData = this.subproject.mcrMasterData;
        this.changedSubproject.cssMasterData = data;
        let updatedSubproject = this.sandbox.updateProject(this.project,this.changedSubproject );
        this.isIFRS15Relevant = this.sandbox.getIFRSRelevantForChangedValue(updatedSubproject);
        this.onChangeEvent.emit(this.changedSubproject);
    }

    /**
     * Function handles approval dialog data when approval button is clicked.
     * @param data
     */
    onApproveStarted(data: ApprovalDialogData) {
        if (data) {
            if (!!this.subproject.cssMasterData && !!this.subproject.cssMasterData.cssSubProjectID) {
                let lastUpdatedSubProjects: LastUpdatedSubProject = {
                    cssSubProjectID: this.subproject.cssMasterData.cssSubProjectID,
                    latestUpdDate: this.subproject.latestUpdDate
                }
                data.lastUpdatedSubProjects = [lastUpdatedSubProjects];
            }

            this.onApproveStartedEvent.emit(data);
        }
    }

    /**
     * Function updates subproject with CssMasterData and subProjectData
     * and emit data subscriber.
     * @param data
     */
    subprojectDataChanged(dataChangeValues: SubprojectDataChange[]) {
        let errors = dataChangeValues.filter(subprojectDataChange => subprojectDataChange.hasError);
        if (errors && errors.length > 0) {
            let eventData: SubprojectErrorEvent = {subproject: this.subproject, error: true};
            this.onSubprojectDataErrorEvent.emit(eventData);
            this.updateSubprojectDataChange(dataChangeValues);
        } else {
            let eventData : SubprojectErrorEvent = {subproject: this.subproject, error: false};
            this.onSubprojectDataErrorEvent.emit(eventData);

            // Handle to emit data in case no error
            let data = this.updateSubprojectDataChange(dataChangeValues);
            this.onChangeEvent.emit(this.changedSubproject);
            this.onSubprojectValueChangedEvent.emit(data);
        }
    }

    /**
     * Function changes subproject values to new currency
     * and updates project data with converted subproject
     * @param newCurrencyId
     */
    private changeCurrency(newCurrencyId: number) {
        this.subproject = this.sandbox.convertSubprojectValuesToNewRate(this.subproject,this.yearlyCurrencyRates, newCurrencyId);
        this.convertContractualAgreedValuesToCurrency(newCurrencyId,this.forecastExRates);

        if (this.project.selectedComparisonVersion.compId != ComparisonVersionType.ACTUAL) {
            this.changeToNewCurrency(newCurrencyId);
        }
    }

    private changeToNewCurrency(newCurrencyId: number) {
        this.subproject.cssMasterData.currencyId = newCurrencyId;
        if (!this.changedSubproject.cssMasterData) {
            this.changedSubproject.cssMasterData = this.subproject.cssMasterData // Always set cssMasterData since it is mandatory object.
        }
        this.changedSubproject.cssMasterData = this.subproject.cssMasterData;
        this.changedSubproject.cssMasterData.currencyId = newCurrencyId;
        this.changedSubproject.mcrMasterData = this.subproject.mcrMasterData;

        this.subprojectVersion.versionSubprojectMap.set(this.comVersion.compId,this.subproject);
        this.subprojectVersion = Object.assign({},this.subprojectVersion);
        let updatedSubproject = this.sandbox.updateProject(this.project,this.subproject, true );
        this.isIFRS15Relevant = this.sandbox.getIFRSRelevantForChangedValue(updatedSubproject);

        const currencyChangedEvent = new ProjectPlanningCurrencyChangeEvent(this.project);
        this.onSubprojectCurrencyChangedEvent.emit(currencyChangedEvent);
        this.onChangeEvent.emit(this.changedSubproject);
    }

    /**
     * Function converts Contractual Agreed OTP/PAO to new currency
     * @param newCurrencyId
     * @param rates
     */
    private convertContractualAgreedValuesToCurrency(newCurrencyId: number, rates : ForecastExRate[]) {
        if(!this.cssMasterDataFieldHasError('contractualOTP')) {
            let contractualOTP = convertValueToNewForecastRate(this.subproject.cssMasterData.contractualOTP,rates,this.subproject.cssMasterData.currencyId,newCurrencyId);
            if (contractualOTP) {
                this.subproject.cssMasterData.contractualOTP = contractualOTP;
            }
        }

        if(!this.cssMasterDataFieldHasError('contractualPAO')) {
            let contractualPAO = convertValueToNewForecastRate(this.subproject.cssMasterData.contractualPAO,rates,this.subproject.cssMasterData.currencyId,newCurrencyId);
            if (contractualPAO) {
                this.subproject.cssMasterData.contractualPAO = contractualPAO;
            }
        }
    }



    /**
     * Function check null for next QG4
     * @param: mcrMasterData
     */
    checkReadOnlyForOTPAndPAO(mcrMasterData: McrMasterData) {
        if (!mcrMasterData.nextQG4) {
            this.isReadOnly = true;
        }
    }

    /**
     * Function checks if user has access right or not
     * if no access right, it will change component to read mode.
     */
    checkAccessRight() {
        if (this.subproject.cssMasterData &&
            !this.readWriteHelper.getAccessRights(this.subproject.cssMasterData.ifrsVersionId).isWritable) {
            this.isReadOnly = true;
            this.hasWritePermission = false;
        }
    }

    /**
     * Function updates subproject with new data change values.
     * @param dataChangeValues
     */
    private updateSubprojectDataChange(dataChangeValues: SubprojectDataChange[]) {
        this.changedSubproject.mcrMasterData = this.subproject.mcrMasterData;
        let data = dataChangeValues.map(subprojectDataChange=> subprojectDataChange.subprojectData);
        this.changedSubproject.subProjectData = data;
        let updatedSubproject = this.sandbox.updateProject(this.project,this.changedSubproject );
        this.isIFRS15Relevant = this.sandbox.getIFRSRelevantForChangedValue(updatedSubproject);
        if (!this.changedSubproject.cssMasterData) {
            this.changedSubproject.cssMasterData = this.subproject.cssMasterData // Always set cssMasterData since it is mandatory object.
        }

        return data;
    }

    /**
     * Checks if IFRS15 relevant field has error.
     * @param fieldName
     */
    private cssMasterDataFieldHasError(fieldName: string) {
        return  this.cssMasterDataFormGroup &&
            this.cssMasterDataFormGroup.controls[fieldName] &&
            this.cssMasterDataFormGroup.controls[fieldName].invalid;
    }
}
