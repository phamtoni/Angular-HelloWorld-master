/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {Injectable} from "@angular/core";
import {
    ActualDataService,
    CurrencyRate,
    CurrencyService,
    CurrentOTP,
    CurrentPAO,
    Project,
    QG4,
    Subproject,
    SubprojectActualData,
    SubprojectData,
    SubprojectService,
    YearlyRate,
} from "../../../../shared/business-domain";
import {select, Store} from "@ngrx/store";
import {combineLatest, Observable} from "rxjs";
import {convertCurrencyRate} from "../../../../shared/utils/currency.helper";
import {Selectors} from "../../+state/project-planning-state.types";
import {
    SubprojectDataArrayLoading,
    SubprojectDataArrayLoadingFailure,
    SubprojectDataArrayLoadingSuccess,
    SubprojectDataLoading,
    SubprojectDataLoadingFailure,
    SubprojectDataLoadingSuccess
} from "../../+state/subproject-actual-data";
import {DefaultErrorHandlerService} from "../../../../shared/";
import {filter, first, map} from "rxjs/operators";
import * as CurrencyRateActions from "../../+state/currency-rate/currency-rate.actions";

@Injectable()
export class SubprojectSanboxService {
    constructor(public store: Store<any>,
                public subprojectService: SubprojectService,
                public currencyService: CurrencyService,
                private serviceErrorHandler: DefaultErrorHandlerService,
                public actualDataService: ActualDataService) {

    }

    private fromStore = {
        subprojectActualData: {
            loading$: this.store.pipe(select(Selectors.subprojectActualData.actualDataLoading)),
            actualDataArray$: this.store.pipe(select(Selectors.subprojectActualData.actualDataArray)),
            actualDataArrayError$: this.store.pipe(select(Selectors.subprojectActualData.actualDataArrayError)),
            subprojectActualData$: this.store.pipe(select(Selectors.subprojectActualData.subprojectActualData)),
            subprojectActualError$: this.store.pipe(select(Selectors.subprojectActualData.subprojectActualError)),
        },
        currencyRates: {
            loading$: this.store.pipe(select(Selectors.currencyRates.subprojectExRatesLoading))
        }
    };

    public data = {
        subprojectActualDataLoading$: this.fromStore.subprojectActualData.loading$,
        actualDataArray$ : this.fromStore.subprojectActualData.actualDataArray$,
        actualDataArrayError$: this.fromStore.subprojectActualData.actualDataArrayError$,
        subprojectActualData$ : this.fromStore.subprojectActualData.subprojectActualData$,
        subprojectActualError$: this.fromStore.subprojectActualData.subprojectActualError$,
    }

    /**
     * Checks if given error type of monthly rates not found.
     */
    public isRateNotFoundError(error): boolean {
        return this.serviceErrorHandler.isRateNotFoundError(error);
    }

    /**
     * Function checks if subproject data is loading based on loading state of currency rates
     * and actual data.
     */
    public isDataLoading(): Observable<boolean>{
        return new Observable<boolean>( subscriber => {
            combineLatest(
                this.fromStore.currencyRates.loading$,
                this.fromStore.subprojectActualData.loading$
            ).subscribe(([currencyRatesLoading,subprojectActualDataLoading]) => {
                const loading = currencyRatesLoading || subprojectActualDataLoading;
                subscriber.next(loading);
            },error => subscriber.error(error),()=>subscriber.complete());
        });
    }

    /**
     * Function calling service from QG4 backend by MRC Project ID.
     * @param mrcProjectId
     */
    fetchAllQG4(mcrPrjId: number): Observable<QG4[]> {
        return this.subprojectService.getAllQG4(mcrPrjId);
    }

    /**
     * Function fetches currency rates for a subproject.
     * @param subproject
     * @param currencies
     * @param compVersion
     */
    public fetchSubprojectCurrencyRates(subproject: Subproject,currencies:Array<number>,compVersion?: number) {
        this.store.dispatch(new CurrencyRateActions.SubprojectLoadBeginAction());
        return new Observable<CurrencyRate[]>( subscriber => {
            this.fetchCurrencyRates(this.getYearList(subproject),currencies,compVersion).subscribe(data => {
                this.store.dispatch(new CurrencyRateActions.SubprojectLoadSuccessAction(data));
                subscriber.next(data);
            },error => {
                this.store.dispatch(new CurrencyRateActions.SubprojectLoadFailureAction(error));
                subscriber.error(error);
            },() => subscriber.complete());
        });
    }

    /**
     * Fetch currency rates based on currency list.
     * @param years
     * @param currencies
     * @param compVersion
     */
    public fetchCurrencyRates(years: Array<number>,currencies:Array<number>,compVersion?: number){
        return this.currencyService.getExchangeRates(years,compVersion,currencies);
    }

    /**
     * Fetches all subproject actual data of one project and updates data store.
     * @param projectId
     */
    public fetchAllSubprojectActualData(projectId: number) {
        return new Observable<SubprojectActualData[]>( subscriber => {
            this.store.dispatch(new SubprojectDataArrayLoading());
            this.actualDataService.getActualData(projectId).subscribe((data:SubprojectActualData[]) => {
                this.store.dispatch(new SubprojectDataArrayLoadingSuccess(data));
                subscriber.next(data);
            }, error =>  {
                this.store.dispatch(new SubprojectDataArrayLoadingFailure(error));
                subscriber.error(error);
            },() => subscriber.complete());
        });


    }

    /**
     * Fetches only one subproject actual data of one project and updates data store.
     * @param projectId
     * @param mcrSubprojectId
     * @param currencyId
     */
    public fetchSubprojectActualData(projectId: number, mcrSubprojectId: number , currencyId ? : number) : Observable<SubprojectActualData> {
        return new Observable<SubprojectActualData>( subscriber => {
            this.store.dispatch(new SubprojectDataLoading());
            this.actualDataService.getActualData(projectId,mcrSubprojectId,currencyId).subscribe((data:SubprojectActualData[]) => {
                if (data && data.length > 0) {
                    this.store.dispatch(new SubprojectDataLoadingSuccess(data[0]));
                    subscriber.next(data[0]);
                } else {
                    this.store.dispatch(new SubprojectDataLoadingSuccess(null));
                    subscriber.next(null);
                }
            }, error =>  {
                this.store.dispatch(new SubprojectDataLoadingFailure(error));
                subscriber.error(error);
            });
        });

    }

    /**
     * Returns error status of actual data request.
     * Only returns errors of monthly rates not found
     */
    public getActualDataArrayError(): Observable<boolean> {
        return this.fromStore.subprojectActualData.actualDataArrayError$.pipe(map(error => this.isRateNotFoundError(error)));
    }

    /**
     * Updates subproject with actual data
     * @param subproject
     * @param subprojectActualDataArray
     */
    public updateSubprojectActualData(subproject: Subproject, subprojectActualDataArray: SubprojectActualData[]) {

        // Find one actual data of one subproject
        let subprojectActualData = !!subprojectActualDataArray ?  subprojectActualDataArray.find(data => data.mcrPrjId == subproject.mcrMasterData.mcrPrjId) : null;

        if (!!subprojectActualData) {
            // Update to SubProjectData of subproject if years match. If not, add new SubProjectData to  subproject.
            subprojectActualData.actualData.forEach(actualData => {
                let subprojectData = subproject.subProjectData.find(subprojectData => actualData.year == subprojectData.year);
                if (subprojectData) {
                    subprojectData.costCompareValue = actualData.actualCostValue;
                    subprojectData.paoCompareValue = actualData.actualPaoValue;
                    subprojectData.otpCompareValue = actualData.actualOtpValue;
                } else {
                    let newSubprojectData = this.createNewSubprojectData();
                    newSubprojectData.year = actualData.year;
                    newSubprojectData.costCompareValue = actualData.actualCostValue;
                    newSubprojectData.paoCompareValue = actualData.actualPaoValue;
                    newSubprojectData.otpCompareValue = actualData.actualOtpValue;
                    subproject.subProjectData.push(newSubprojectData);
                }
            });
        }
    }

    /**
     * Clears subproject actual or yap data
     * @param subproject
     */
    public clearSubprojectActualData(subproject: Subproject) {
        subproject.subProjectData.forEach(subprojectData => {
            subprojectData.costCompareValue = null;
            subprojectData.otpCompareValue = null;
            subprojectData.paoCompareValue = null;
        });
    }

    /**
     * Initializes an empty SubprojectData
     */
    private createNewSubprojectData(): SubprojectData  {
        let newSubprojectData = new SubprojectData();
        newSubprojectData.year = null;
        newSubprojectData.currentCost = null;
        newSubprojectData.costCompareValue = null;
        newSubprojectData.currentOTP = null;
        newSubprojectData.otpCompareValue = null;
        newSubprojectData.currentPAO = null;
        newSubprojectData.paoCompareValue = null;
        return newSubprojectData;
    }

    /**
     * Function gets list of year for a subproject.
     * @param subproject
     */
    private getYearList(subproject: Subproject): Array<number>{
        let yearList:Array<number> = [];
        subproject.subProjectData.forEach(subProjectData => {
            if (yearList.indexOf(subProjectData.year) < 0 ) {
                yearList.push(subProjectData.year)
            }
        })
        return yearList;
    }


    /**
     * Function converts a subproject to new currency with given exchange rates.
     * @param subproject
     * @param rates
     * @param newCurrencyId
     */
    public convertSubprojectValuesToNewRate(subproject: Subproject,rates: CurrencyRate[], newCurrencyId : number) {
        let clonedSubproject : Subproject = Object.assign( new Subproject(),subproject);
        let currencyId = subproject.cssMasterData.currencyId;
        let currencyRate = rates.find(rate => rate.curId === currencyId);
        let newCurrencyRate = rates.find(rate => rate.curId === newCurrencyId);

        let subProjectData : SubprojectData [] = [];
        let subprojectValues = subproject.subProjectData;
        subprojectValues.forEach(subprojectValue => {
            let clonedValue = Object.assign({},subprojectValue);
            let year = clonedValue.year;
            let oldRate = currencyRate && currencyRate.ratePerYears.find(rate => rate.year === year);
            let newRate = newCurrencyRate && newCurrencyRate.ratePerYears.find(rate => rate.year === year);
            let value = this.convertSubprojectValueToNewRate(clonedValue, oldRate, newRate);
            subProjectData.push(value);
        });

        clonedSubproject.subProjectData = subProjectData;
        return clonedSubproject;
    }

    /**
     * Function converts subproject value to new currency rate.
     * @param subprojectValue
     * @param oldRate
     * @param newRate
     */
    private convertSubprojectValueToNewRate(subprojectValue: SubprojectData,oldRate: YearlyRate, newRate: YearlyRate) {
        let value = new SubprojectData();
        value.currentOTP = new CurrentOTP();
        value.currentOTP.subPrjOtpValueId = subprojectValue.currentOTP ? subprojectValue.currentOTP.subPrjOtpValueId : null;
        value.currentOTP.updDate = subprojectValue.currentOTP ? subprojectValue.currentOTP.updDate : null;

        value.currentPAO = new CurrentPAO();
        value.currentPAO.subPrjPaoValueId = subprojectValue.currentPAO ? subprojectValue.currentPAO.subPrjPaoValueId : null;
        value.currentPAO.updDate = subprojectValue.currentPAO ? subprojectValue.currentPAO.updDate : null;

        value.year = subprojectValue.year;
        let oldRateValue = oldRate ? oldRate.rate : null;
        let newRateValue = newRate ? newRate.rate : null;
        value.currentCost = convertCurrencyRate(subprojectValue.currentCost,oldRateValue,newRateValue);
        value.costCompareValue = convertCurrencyRate(subprojectValue.costCompareValue,oldRateValue,newRateValue);

        if (subprojectValue.currentOTP && !subprojectValue.currentOTP.error) {
            value.currentOTP.otpValue = convertCurrencyRate(subprojectValue.currentOTP.otpValue,oldRateValue,newRateValue);
        } else {
            value.currentOTP =  subprojectValue.currentOTP;
        }

        value.otpCompareValue = convertCurrencyRate(subprojectValue.otpCompareValue,oldRateValue,newRateValue);

        if (subprojectValue.currentPAO && !subprojectValue.currentPAO.error) {
            value.currentPAO.paoValue = convertCurrencyRate(subprojectValue.currentPAO.paoValue,oldRateValue,newRateValue);
        } else {
            value.currentPAO = subprojectValue.currentPAO;
        }

        value.paoCompareValue = convertCurrencyRate(subprojectValue.paoCompareValue,oldRateValue,newRateValue);
        return value;
    }


    /**
     * Function checks IFRS Relevant when table value/ contractual fields are changed to 0/empty/null
     * @param Subproject
     */
    getIFRSRelevantForChangedValue(changedSubproject : Subproject) {
        if (changedSubproject) {
            let changedCssMD = changedSubproject.cssMasterData ? changedSubproject.cssMasterData : null;

            if ((changedCssMD && changedCssMD.contractualOTP && changedCssMD.contractualOTP > 0) ||
                (changedCssMD && changedCssMD.contractualPAO && changedCssMD.contractualPAO > 0)) {
                return true;
            }

            if (changedSubproject && changedSubproject.subProjectData) {
                return this.getIFRSRelevantForSubprojectData(changedSubproject.subProjectData);
            }
        }


        return false;
    }

    /**
     * Function checks value of table is 0/empty/null or not for the IFRS relevant flag
     * @param SubprojectData[]
     */
    getIFRSRelevantForSubprojectData(subProjectData: SubprojectData[]) {
        for (let i = 0; i < subProjectData.length; i++) {
            if (subProjectData[i].currentOTP && subProjectData[i].currentOTP.otpValue && subProjectData[i].currentOTP.otpValue > 0) {
                return true;
            }
            if (subProjectData[i].currentPAO && subProjectData[i].currentPAO.paoValue && subProjectData[i].currentPAO.paoValue > 0) {
                return true;
            }
        }

        return  false;
    }

    /**
     * Function updates project with  new subproject.
     * @param project
     * @param subproject
     * @param overwrite
     */
    public updateProject(project: Project, subproject: Subproject, overwrite:boolean = false) : Subproject {
        if ( project ) {
            let foundSubproject = project.subProjects.find(currentSubproject=>currentSubproject.mcrMasterData.mcrPrjId == subproject.mcrMasterData.mcrPrjId);

            if (overwrite) {
                foundSubproject.cssMasterData = subproject.cssMasterData;
            } else if (subproject.cssMasterData) {

                let cssSubProjectID = foundSubproject.cssMasterData.cssSubProjectID;
                let updDate = foundSubproject.cssMasterData.updDate;
                Object.assign(foundSubproject.cssMasterData,subproject.cssMasterData)
                if (!foundSubproject.cssMasterData.cssSubProjectID) {
                    foundSubproject.cssMasterData.cssSubProjectID = cssSubProjectID;
                }
                if (!foundSubproject.cssMasterData.updDate) {
                    foundSubproject.cssMasterData.updDate = updDate;
                }
            }

            if (overwrite) {
                foundSubproject.subProjectData = subproject.subProjectData;
            } else if (subproject.subProjectData) {
                subproject.subProjectData.forEach(subprojectData => {
                    this.updateSubprojectData(foundSubproject.subProjectData,subprojectData);
                });
            }

            if (foundSubproject && foundSubproject.mcrMasterData) {
                // Check ifrsRevelant for on foundSubproject
                foundSubproject.mcrMasterData.ifrsRevelant = this.getIFRSRelevantForChangedValue(foundSubproject);
            }

            if(foundSubproject && subproject.latestUpdDate) {
                foundSubproject.latestUpdDate = subproject.latestUpdDate;
            }

            return foundSubproject;

        }

        return  null;
    }

    /**
     * Function updates Subproject Data list with new given SubprojectData
     * Only SubprojectData has same year will be updated.
     * @param curerntSubprojectDataList
     * @param newSubprojectData
     */
    private updateSubprojectData(curerntSubprojectDataList: SubprojectData[], newSubprojectData: SubprojectData) {
        if(curerntSubprojectDataList) {
            curerntSubprojectDataList.forEach(currentSubprojectData => {
                if(currentSubprojectData.year  == newSubprojectData.year) {
                    Object.assign(currentSubprojectData,newSubprojectData);
                }
            })
        }
    }
}
