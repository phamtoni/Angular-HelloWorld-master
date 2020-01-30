/*
 * Copyright 2019. (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */
import {Injectable} from '@angular/core';
import {select, Store} from '@ngrx/store';
import {combineLatest, forkJoin, Observable, of} from 'rxjs';
import {filter, first, flatMap, map, share, startWith, switchMap} from 'rxjs/operators';
import {
    ActualData,
    ApprovalDialogData,
    ApprovalResponse,
    ApprovalService,
    ComparisonVersions,
    ComparisonVersionType,
    CssSubprojectApprovalResponse,
    CurrencyRate,
    CurrentOTP,
    CurrentPAO,
    DialogResult,
    ForecastExRate,
    getTotalValueOf,
    LastUpdatedSubProject,
    LoadingIndicatorService,
    McrMasterData,
    MessageDialogService,
    muteFirst,
    ProjectNavigation,
    ProjectNavigationItem,
    ProjectPlanningService,
    ReadWriteHelper,
    ServiceErrorCode,
    SnackBarService,
    Subproject,
    SubprojectActualData
} from '../../shared';
import {Selectors} from './+state/project-planning-state.types';
import * as ProjectNavigateAction from './+state/project-navigation/project-navigation.actions';
import {Currency, Project, ProjectValue, SubProjectVersion} from "../../shared/business-domain";
import * as ProjectActions from "./+state/project/project.actions";
import * as CurrencyActions from "./+state/currency/currency.actions";
import * as CurrencyRateActions from "./+state/currency-rate/currency-rate.actions";
import {
    SubprojectChanged,
    SubprojectCompareVersionChanged,
    SubprojectLoading,
    SubprojectLoadingFailure
} from "./+state/subproject";
import {SubprojectSanboxService} from "./components/subproject/subproject-sanbox.service";
import {ProjectSandboxService} from "./components/project/project-sandbox.service";
import * as MESSAGES from "../../shared/constants/messages.constant";
import {convertValueToNewForecastRate} from "../../shared/utils/currency.helper";


@Injectable()
export class ProjectPlanningSandboxService {
    constructor(
        private store: Store<any>,
        private loadingService: LoadingIndicatorService,
        private cssPlanningService: ProjectPlanningService,
        private subprojectSanboxService : SubprojectSanboxService,
        private projectSanboxService : ProjectSandboxService,
        public  messageDialogService: MessageDialogService,
        private snackBar: SnackBarService,
        private loadingIndicatorService: LoadingIndicatorService,
        private approvalService: ApprovalService,
        private readWriteHelper: ReadWriteHelper) {
    }

    /**
     * Object contains data from store.
     */
    private fromStore = {
        projectNavigation: {
            loading$: this.store.pipe(select(Selectors.projectNavigation.loading)),
            loaded$: this.store.pipe(select(Selectors.projectNavigation.loaded)),
            error$: this.store.pipe(select(Selectors.projectNavigation.error)),
            projectNavigations$: this.store.pipe(select(Selectors.projectNavigation.projectNavigation)),
            selectedNavItem$: this.store.pipe(select(Selectors.projectNavigation.selectedNavItem))
        },
        project: {
            reload$: this.store.pipe(select(Selectors.project.reload)),
            loading$: this.store.pipe(select(Selectors.project.loading)),
            saving$: this.store.pipe(select(Selectors.project.saving)),
            discard$: this.store.pipe(select(Selectors.project.discard)),
            loaded$: this.store.pipe(select(Selectors.project.loaded)),
            error$: this.store.pipe(select(Selectors.project.error)),
            project$: this.store.pipe(
                select(Selectors.project.project)
            ),
            originalProject$: this.store.pipe(
                select(Selectors.project.originalProject),
            ),
            buttonsVisibility$:this.store.pipe(select(Selectors.project.buttonsVisibility)),
            approvalPermissions$: this.store.pipe(select(Selectors.project.approvalPermissions))
        },
        currencies: {
            reload$: this.store.pipe(select(Selectors.currencies.reload)),
            loading$: this.store.pipe(select(Selectors.currencies.loading)),
            loaded$: this.store.pipe(select(Selectors.currencies.loaded)),
            error$: this.store.pipe(select(Selectors.currencies.error)),
            currencies$: this.store.pipe(
                select(Selectors.currencies.currencies),
            ),
        },
        currencyRates: {
            reload$: this.store.pipe(select(Selectors.currencyRates.reload)),
            loading$: this.store.pipe(select(Selectors.currencyRates.loading)),
            loaded$: this.store.pipe(select(Selectors.currencyRates.loaded)),
            fullRatesLoading$: this.store.pipe(select(Selectors.currencyRates.fullCurrencyRatesLoading)),
            fullRatesLoaded$: this.store.pipe(select(Selectors.currencyRates.fullCurrencyRatesLoaded)),
            currencyRates$: this.store.pipe(
                select(Selectors.currencyRates.currencyRates),
            ),
            fullCurrencyRates$: this.store.pipe(
                select(Selectors.currencyRates.fullCurrencyRates),
            ),
            forecastRatesLoaded$:this.store.pipe(select(Selectors.currencyRates.forecastRatesLoaded)),
            forecastExRates$: this.store.pipe(
                select(Selectors.currencyRates.forecastExRates),
            )
        },
        subproject: {
            reload$: this.store.pipe(select(Selectors.subproject.reload)),
            loading$: this.store.pipe(select(Selectors.subproject.loading)),
            error$: this.store.pipe(select(Selectors.subproject.error)),
            selection$: this.store.pipe(select(Selectors.subproject.selection)),
            originalSubproject$: this.store.pipe(select(Selectors.subproject.originalSubproject)),
            modifiedSubproject$: this.store.pipe(select(Selectors.subproject.modifiedSubproject)),
            subProjectVersions$: this.store.pipe(select(Selectors.subproject.subProjectVersions)),
        }
    };

    /**
     * Object contains latest data from backend.
     */
    private fromBackend = {
        currencies: {
            reload$: this.fromStore.currencies.reload$.pipe(
                filter(need => need), // only, when reload is required
                switchMap(() => this.fetchCurrencies()), // perform the actual fetch operation
                share(), // make sure, the result is shared in case of multiple subscribers
                startWith(null) // initial value
            )
        },
        forecastExRates: {
            reload$: this.fromStore.currencyRates.forecastRatesLoaded$.pipe(
                filter(loaded => !loaded), // only, when data is not loaded
                switchMap(() => of(this.fetchForecastExRates())), // perform the actual fetch operation
                share(), // make sure, the result is shared in case of multiple subscribers
                startWith(null) // initial value
            )
        }
    };

    /**
     * Object contains data for module.
     */
    public data = {
        projectNavigation$:  this.fromStore.projectNavigation.projectNavigations$,
        selectedNavItem$: this.fromStore.projectNavigation.selectedNavItem$,
        project$: this.fromStore.project.project$,
        currencies$:  muteFirst(this.fromBackend.currencies.reload$, this.fromStore.currencies.currencies$),
        projectLoading$:  this.fromStore.project.loading$,
        projectDiscard$:  this.fromStore.project.discard$,
        actualDataSumLoading$: this.projectSanboxService.data.actualDataSumLoading$,
        projectError$:  this.fromStore.project.error$,
        projectSaving$:  this.fromStore.project.saving$,
        projectNavigationLoading$: this.fromStore.projectNavigation.loading$,
        buttonsVisibility$: this.fromStore.project.buttonsVisibility$,
        approvalPermissions$:this.fromStore.project.approvalPermissions$,
        subProjectVersions$: this.fromStore.subproject.subProjectVersions$,
        seletedSubproject$: this.fromStore.subproject.selection$,
        originalSubproject$: this.fromStore.subproject.originalSubproject$,
        subprojectsloading$: this.fromStore.subproject.loading$,
        subprojectActualDataLoading$: this.subprojectSanboxService.data.subprojectActualDataLoading$,
        currencyRateLoading$ : this.fromStore.currencyRates.loading$,
        fullCurrencyRates$ : this.fromStore.currencyRates.fullCurrencyRates$,
        forecastExRates$ : muteFirst(this.fromBackend.forecastExRates.reload$,this.fromStore.currencyRates.forecastExRates$)
    };

    /**
     * Returns project data from store
     */
    public getProjectDataFromStore(): Observable<any> {
        return this.fromStore.project.project$;
    }

    /**
     * Returns forecast exchange rates from store
     */
    public getForecastExRatesFromStore(): Observable<any>{
        return this.fromStore.currencyRates.forecastExRates$;
    }

    /**
     * Returns error status of actual data sum request.
     */
    public getActualDataSumError() : Observable<boolean> {
        return this.projectSanboxService.getActualDataSumError();
    }

    /**
     * Returns subProjectVersions data from store.
     */
    public getSubprojectVersionFromStore() {
        return this.fromStore.subproject.subProjectVersions$;
    }

    /**
     * Function gets project data from backend by MCR Project ID.
     * if prjId is provided, subproject & project navigation data will be fetched asynchronously
     * @param mrcProjectId
     * @param prjId
     */
    public getProjectData(mrcProjectId: string, prjId?: number) {
        this.store.dispatch(new ProjectActions.LoadBeginAction());

        if (!!prjId) {
            this.getProjectNavigation(prjId);
            this.projectSanboxService.fetchActualDataSummary(prjId);
            this.store.dispatch(new SubprojectLoading());

            // ComparisonVersion set to Actuals for initial load.
            this.getProjectSubprojects(prjId, ComparisonVersionType.ACTUAL);
        }

        this.cssPlanningService.getProjectData(mrcProjectId).pipe(
            flatMap( (project: Project) => {

                if (!prjId) {
                    this.getProjectNavigation(project.prjId);
                    this.projectSanboxService.fetchActualDataSummary(project.prjId);
                    this.store.dispatch(new SubprojectLoading());
                    this.getProjectSubprojects(project.prjId, project.selectedComparisonVersion.compId);
                }

                return of(project);
            })
        ).subscribe(
            data=> {
                this.store.dispatch(new ProjectActions.LoadSuccessAction(data))
            }
            , error => {
                this.store.dispatch(new ProjectActions.LoadFailureAction(error))
            });
    }

    /**
     * Function gets project navigation data from backend by Project ID.
     * @param projectId
     */
    public getProjectNavigation(projectId: number)  {
        this.store.dispatch(new ProjectNavigateAction.LoadBeginAction());
        this.cssPlanningService.getProjectNagivationItems(projectId).subscribe(
            data=> {
                this.store.dispatch(new ProjectNavigateAction.LoadSuccessAction(data))
            }
            , error => {
                this.store.dispatch(new ProjectNavigateAction.LoadFailureAction(error))
            });
    }

    /**
     * Function selects a sub-project based on MCR project ID.
     * @param mcrProjectId
     */
    public selectProjectNavigationItem(mcrProjectId: string) {
        return this.fromStore.projectNavigation.projectNavigations$
            .subscribe((projectNavigation: ProjectNavigation)=> {
                let selectedItem: ProjectNavigationItem = projectNavigation.subProjects.find( item => item.mcrId === mcrProjectId);
                if (selectedItem) {
                    this.store.dispatch(new ProjectNavigateAction.NavigationSelectAction(selectedItem));
                }
            })
    }

    /**
     * Function reset project navigation selection by setting null
     * for selected navigation item in state.
     */
    public resetProjectNavigationItem() {
        this.store.dispatch(new ProjectNavigateAction.NavigationSelectAction(null));
    }

    /**
     * Function get loading status of component by detecting loading status of all
     * backend requests.
     */
    public getLoadingStatus() {
        return combineLatest(
            this.fromStore.project.loading$,
            this.fromStore.currencies.loading$,
            this.fromStore.projectNavigation.loading$,
            this.fromStore.project.loaded$,
            this.fromStore.currencies.loaded$,
            this.fromStore.projectNavigation.loaded$
        ).subscribe(([projectLoading, currenciesLoading,projectNavigationLoading,projectLoaded,currenciesLoaded,projectNavigationLoaded  ]) => {
            let isLoading = projectLoading ||  currenciesLoading || projectNavigationLoading;
            let isLoaded = projectLoaded && currenciesLoaded && projectNavigationLoaded;
            if (isLoading && !isLoaded) {
                this.loadingService.show();
            } else if (!isLoading && isLoaded) {
                this.loadingService.hide();
            }
        });
    }

    /**
     * Function handles to save project data.
     * @param project
     * @param subprojects
     */
    public saveProject(project:Project,subprojects:Subproject[]){
        return new Observable<Subproject[]>( subscriber => {
            this.loadingIndicatorService.show();
            this.saveSubprojectOfProject(project.prjId,subprojects).subscribe(data => {
                this.loadingIndicatorService.hide();
                this.snackBar.success(MESSAGES.PROJECT_SAVE_SUCCESS);
                this.updateProjectData(project,data);
                this.updateSubprojectData(data,project.selectedComparisonVersion.compId);
                subscriber.next(data);
            }, error => {
                this.loadingIndicatorService.hide();
                if (error.error && error.error.errorCode == ServiceErrorCode.OUT_DATED_DATA) {
                    this.messageDialogService.showConfirmDialog(MESSAGES.PROJECT_SAVE_CONFLICT_ERROR,
                        {
                            okBtnMsg: "OK",
                            cancelBtn: false
                        }
                    ).subscribe((ok: boolean) => {
                        this.getProjectSubprojects(project.prjId, project.selectedComparisonVersion.compId);
                        subscriber.next(null);
                    });
                } else {
                    this.snackBar.error(MESSAGES.PROJECT_SAVE_ERROR);
                    subscriber.error(error);
                }
            });
        });
    }

    /**
     * Function handles to discard project data change and restore
     * to original project data.
     * @param project
     * @param changedSubprojectMap
     * @param subprojectErrors
     */
    public discardProjectValue(project:Project,changedSubprojectMap : Map<string,Subproject>, subprojectErrors: string[]){
        return new Observable<boolean>( subscriber => {
            if (changedSubprojectMap.size > 0 || subprojectErrors.length > 0) {
                this.messageDialogService.showConfirmDialog(MESSAGES.PROJECT_DISCARD_CONFIRM).subscribe(
                    (confirmed: boolean) => {
                        if (confirmed) {
                            this.store.dispatch(new ProjectActions.DiscardAction(project));
                            this.getProjectSubprojects(project.prjId, project.selectedComparisonVersion.compId);
                            changedSubprojectMap.clear();
                            subscriber.next(true);
                        } else {
                            subscriber.next(false);
                        }
                    });
            } else {
                subscriber.next(true);
            }
        });
    }

    /**
     * Function reloads latest data from server to solve conflict error when saving subproject(s).
     * This error happens when saving a record which has been changed by other users.
     * @param project
     * @param error
     */
    public handleConflictError(error: any) {
        if (error.error && (
            error.error.errorCode == ServiceErrorCode.OUT_DATED_DATA ||
            error.error.errorCode == ServiceErrorCode.INCORRECT_PARAMS )
        ) {
            this.messageDialogService.showConfirmDialog(MESSAGES.PROJECT_APPROVAL_CONFLICT_ERROR,
                {
                    okBtnMsg: "OK",
                    cancelBtn: false
                }
            ).subscribe((ok: boolean) => {
                let project: Project = error.project;
                this.getProjectSubprojects(project.prjId, project.selectedComparisonVersion.compId);
            });
        }
    }

    /**
     * Function handles to change project value.
     * @param project
     */
    public changeProjectValue(){
        combineLatest(
            this.fromStore.project.project$,
            this.projectSanboxService.data.actualDataSum$
        ).pipe(
            first(),
            flatMap(([project , actualDataSum ]) =>  {
                return this.updateProjectDataTable(project, actualDataSum);
            })
        ).subscribe( project => {
            this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({}, project)));
        });
    }

    /**
     * Function selects a navigation item in project navigation.
     * If mcrProjectId is null, parent item will be selected.
     * Otherwise, a specified item will be selected.
     * @param mcrProjectId
     */
    public selectNavigationItem(mcrProjectId?: string) {
        if (mcrProjectId) {
            this.selectProjectNavigationItem(mcrProjectId);
        } else {
            this.resetProjectNavigationItem();
        }
    }

    /**
     * Function change project data to new currency.
     * @param project
     * @param newCurrencyId
     */
    public changeCurrency(project: Project, newCurrencyId: number) {
        if (project.selectedComparisonVersion.compId == ComparisonVersionType.ACTUAL) {
            this.projectSanboxService.fetchActualDataSummaryObservable(project.prjId,newCurrencyId)
                .subscribe((actualDataSum: ActualData[]) => {
                    this.updateProjectDataTable(project, actualDataSum, newCurrencyId).subscribe(data => this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({}, project))));
                    this.calculateProjectTotalContractualAgreedValues();
                }, error => {
                    this.updateProjectDataTable(project, null, newCurrencyId).subscribe(data => this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({}, project))));
                    this.calculateProjectTotalContractualAgreedValues();
                });
        } else {
            this.updateProjectDataTable(project, null, newCurrencyId).subscribe(data => this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({}, project))));
            this.calculateProjectTotalContractualAgreedValues();
        }

    }

    /**
     * Function converts all subproject values to new currency.
     * @param project
     * @param newCurrencyId
     */
    private convertProjectValuesToNewCurrency(project: Project, newCurrencyId: number) {
        return new Observable<Subproject[]>( subscriber => {
            this.fromStore.currencyRates.fullCurrencyRates$.pipe(first())
                .subscribe((rates: CurrencyRate[]) => {
                    if (rates && rates.length > 0) {
                        subscriber.next(this.convertProjectValuesToNewRate(project, rates, newCurrencyId));
                    } else {
                        this.fetchCurrencyRates(this.getYearList(project), this.getCurrencyList(project), project.selectedComparisonVersion.compId).subscribe((rates: CurrencyRate[] ) => {
                            if (rates && rates.length > 0) {
                                subscriber.next(this.convertProjectValuesToNewRate(project, rates, newCurrencyId));
                            } else {
                                subscriber.next(project.subProjects);
                            }
                        });
                    }
                });
        });
    }

    /**
     * Function convert project value to new currency.
     * @param project
     * @param rates
     * @param newCurrencyId
     */
    private convertProjectValuesToNewRate(project: Project,rates: CurrencyRate[], newCurrencyId : number) {
        let subProjects: Subproject [] = []
        project.subProjects.forEach(subproject => {
            subProjects.push(this.subprojectSanboxService.convertSubprojectValuesToNewRate(subproject,rates,newCurrencyId));
        });

        return subProjects;
    }

    /**
     * Function gets list of year from subprojects.
     * @param project
     */
    private getYearList(project: Project): Array<number>{
        let yearList:Array<number> = [];
        project.subProjects.forEach(subproject => {
            let dataTable = subproject.subProjectData;
            dataTable.forEach(dataValue => {
                if (yearList.indexOf(dataValue.year) < 0  && !!dataValue.year) {
                    yearList.push(dataValue.year)
                }
            })
        })
        return yearList;
    }

    /**
     * Function gets list of currency from subprojects.
     * @param project
     */
    private getCurrencyList(project: Project) : Array<number> {
        let currencyList = [project.selectedCurrency.curId];
        project.subProjects.forEach(subproject => {
            if (currencyList.indexOf(subproject.cssMasterData.currencyId) < 0) {
                currencyList.push(subproject.cssMasterData.currencyId);
            }
        });

        return currencyList;
    }

    /**
     * Function checks if currency conversion is needed or not
     * @param project
     * @param newCurrencyId
     */
    private shouldConvertCurrency(project: Project, newCurrencyId : number) : boolean {
        for(let i=0;i<project.subProjects.length ; i++) {
            if(project.subProjects[i] &&
                project.subProjects[i].cssMasterData &&
                project.subProjects[i].cssMasterData.currencyId &&
                project.subProjects[i].cssMasterData.currencyId != newCurrencyId) {
                return true;
            }
        }
        return  false;
    }

    /**
     * Function checks if overwriting operation can be performed.
     * @param subproject
     */
    public canOverwriteSubproject(subproject: Subproject) {
        if(this.readWriteHelper.getAccessRights(subproject.cssMasterData.ifrsVersionId).isWritable &&
            subproject.mcrMasterData.nextQG4 != null ) {
            return true;
        }
        return  false;
    }

    /**
     * Function checks if overwriting operation can be performed
     * for contractual agreed fields.
     * @param subproject
     * @param attributeName
     */
    public canOverwriteContractualAgreedValue(subproject: Subproject, attributeName : string) {
        if(this.readWriteHelper.getAccessRights(subproject.cssMasterData.ifrsVersionId).isWritable &&
            subproject.mcrMasterData.nextQG4 != null && subproject.cssMasterData.contractSigning ) {
            let subprojectSum = getTotalValueOf(attributeName,subproject.getFormattedData());
            return subprojectSum != 0;
        }
        return  false;
    }

    /**
     * Function updates subproject data for new comparision version.
     * New subproject data will be pushed into map for new comparision version.
     * @param subProjectVersionArray
     * @param subprojects
     * @param compareVersion
     */
    private updateSubprojectVersionData(subProjectVersionArray : SubProjectVersion [], subprojects : Subproject[], compareVersion: number) {
        if (subProjectVersionArray && subProjectVersionArray.length > 0) {
            subProjectVersionArray.forEach(subProjectVersion => {
                subprojects.forEach(subproject=> {
                    if (subProjectVersion.id === subproject.mcrMasterData.mcrSubProjectId) {
                        subProjectVersion.versionSubprojectMap.set(compareVersion,subproject);
                        subProjectVersion.activeVersion = compareVersion;
                    }
                });
            });
        } else {
            subprojects.forEach(subproject=> {
                let subprojectVersion = new SubProjectVersion();
                subprojectVersion.id = subproject.mcrMasterData.mcrSubProjectId;
                subprojectVersion.activeVersion = compareVersion;
                subprojectVersion.versionSubprojectMap.set(compareVersion,subproject);
                subProjectVersionArray.push(subprojectVersion);
            });
        }

        let result:SubProjectVersion [] = subProjectVersionArray.map<SubProjectVersion>(data => Object.assign(new SubProjectVersion(),data));
        return result;
    }

    /**
     * Function updates subproject data change after approval.
     * @param subProjectVersionArray
     * @param subprojects
     * @param compareVersion
     */
    private updateCssSubprojectDataChange(subProjectVersionArray : SubProjectVersion [], subprojects : Subproject[],compareVersion: number) {
        if (subProjectVersionArray && subProjectVersionArray.length > 0) {
            subProjectVersionArray.forEach(subProjectVersion => {
                let currentSubproject = subProjectVersion.versionSubprojectMap.get(compareVersion);
                subprojects.forEach(subproject=> {
                    if (subproject.mcrMasterData.mcrPrjId === currentSubproject.mcrMasterData.mcrPrjId){
                        currentSubproject.cssMasterData.cssSubProjectID = subproject.cssMasterData.cssSubProjectID;
                        currentSubproject.cssMasterData.updDate =  subproject.cssMasterData.updDate;
                        currentSubproject.updUser = subproject.updUser;
                        currentSubproject.lastChangeDate = subproject.lastChangeDate;
                        currentSubproject.latestUpdDate = subproject.latestUpdDate;
                    }
                });
            });
        }

        let result:SubProjectVersion [] = subProjectVersionArray.map<SubProjectVersion>(data => Object.assign(new SubProjectVersion(),data));
        return result;
    }

    /**
     * Function combines project & subproject data
     * and calculate sum values.
     * @param compareVersion
     * @param subProjectVersions
     */
    private getCombinedProjectData(project: Project,compareVersion : number,subProjectVersions : SubProjectVersion[]) {
        combineLatest(
            this.projectSanboxService.data.actualDataSum$
        ).pipe(
            flatMap(([actualDataSum ]) =>  {
                if (project) {
                    let subProjectVersionArray : SubProjectVersion[] = subProjectVersions ? subProjectVersions :[];
                    project.selectedComparisonVersion = ComparisonVersions.find(compVersion => compVersion.compId == compareVersion);
                    project.subProjects = subProjectVersionArray.map(subProjectVersion=> subProjectVersion.versionSubprojectMap.get(compareVersion));

                    this.calculateProjectTotalContractualAgreedValues();
                }

                // Load all rates from server and put in store.
                let yearList = this.getYearList(project);
                if (yearList.length > 0) {
                    this.fetchFullCurrencyRates(yearList,project.selectedComparisonVersion.compId);
                }

                return this.updateProjectDataTable(project,actualDataSum);
            })
        ).subscribe(project => {
            this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({},project)));
        });
    }

    /**
     * Function updates subprojects in store with values from project.
     * @param project
     */
    public updateSubprojects(project: Project) {
        return combineLatest(
            this.fromStore.subproject.subProjectVersions$
        ).pipe(
            first()
        ).subscribe(([subProjectVersions]) => {
            let subprojectVersionArray : SubProjectVersion[] = subProjectVersions;
            subprojectVersionArray = this.overwriteSubprojects(subprojectVersionArray,project);

            this.store.dispatch(new SubprojectChanged(Array.from(subprojectVersionArray)));
        });
    }

    /**
     * Function overwrites Contractual Agreed OTP/PAO from project level
     * to all subprojects.
     * If currency of subproject is different from project, currency conversion is used
     * to convert values to subproject currencies
     * @param project
     */
    public updateContractualAgreedValues(project: Project) {
        return combineLatest(
            this.getSubprojectVersionFromStore(),
            this.getForecastExRatesFromStore()
        ).pipe(
            first()
        ).subscribe(([subProjectVersions,forecastExRates]) => {
            let subprojectVersionArray : SubProjectVersion[] = subProjectVersions;

            if (!forecastExRates || forecastExRates.length <= 0) {
                this.subprojectSanboxService.currencyService.getCurentForecastExchangeRates(this.getCurrencyList(project)).subscribe(rates => {
                    subprojectVersionArray = this.overwriteContractualAgreedValuesToSubprojects(subprojectVersionArray,project,rates);
                    this.store.dispatch(new SubprojectChanged(Array.from(subprojectVersionArray)));
                });
            } else {
                subprojectVersionArray = this.overwriteContractualAgreedValuesToSubprojects(subprojectVersionArray,project,forecastExRates);
                this.store.dispatch(new SubprojectChanged(Array.from(subprojectVersionArray)));
            }
        });
    }

    /**
     * recall backend with the YAP/Actuals data
     * @param project
     * @param changedSubprojectMap
     */
    public getComparisonValueSubprojects(project: Project, changedSubprojectMap : Map<string,Subproject>, subprojectErrors: string[]) {
        return new Observable<boolean>( subscriber => {
            if (changedSubprojectMap.size> 0) {
                this.messageDialogService.showConfirmDialogWithThirdOptions(MESSAGES.PROJECT_SAVE_CONFIRM,MESSAGES.PROJECT_SAVE_TITLE).subscribe(
                    (result: DialogResult) => {
                        if (result == DialogResult.YES) {
                            if (subprojectErrors.length > 0) {
                                project.selectedComparisonVersion = project.originalComparisonVersion;
                                this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({},project)));
                                this.messageDialogService.showConfirmDialog(MESSAGES.PROJECT_HAS_ERROR_MESSAGE,
                                    {
                                        okBtnMsg: "OK",
                                        cancelBtn: false
                                    }
                                )
                                subscriber.next(false);
                            } else {
                                this.store.dispatch(new SubprojectLoading());
                                let subProjects = project.subProjects.filter(subproject => changedSubprojectMap.has(subproject.mcrMasterData.mcrSubProjectId) );
                                this.subprojectSanboxService.subprojectService.saveSubprojects(subProjects,project.prjId).subscribe(data => {
                                    this.getProjectSubprojects(project.prjId, project.selectedComparisonVersion.compId);
                                    changedSubprojectMap.clear();
                                }, error => {
                                    this.store.dispatch(new SubprojectLoadingFailure(error));
                                    changedSubprojectMap.clear();
                                    this.handleSavingError(project,error);
                                });
                                subscriber.next(true);
                            }
                        } else if(result == DialogResult.NO) {
                            this.store.dispatch(new SubprojectLoading());
                            this.getProjectSubprojects(project.prjId, project.selectedComparisonVersion.compId);
                            changedSubprojectMap.clear();
                            subprojectErrors = [];
                            subscriber.next(true);
                        } else {
                            project.selectedComparisonVersion = project.originalComparisonVersion;
                            this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({},project)));
                        }
                    }
                )
            } else {
                this.store.dispatch(new SubprojectLoading());
                this.getProjectSubprojects(project.prjId, project.selectedComparisonVersion.compId);
                subscriber.next(true);
            }
        })
    }

    /**
     * Function detects if there is any change on project
     * If yes, show popup to ask for saving data.
     * @param project
     * @param changedSubprojectMap
     * @param subprojectErrors
     */
    public detectDataChanges(project: Project, changedSubprojectMap : Map<string,Subproject>, subprojectErrors: string[]) {
        return  new Observable<boolean>(subscriber => {
            if (changedSubprojectMap.size> 0) {
                this.messageDialogService.showConfirmDialogWithThirdOptions(MESSAGES.PROJECT_SAVE_CONFIRM,MESSAGES.PROJECT_SAVE_TITLE).subscribe(
                    (result: DialogResult) => {
                        if (result == DialogResult.YES) {
                            if (subprojectErrors.length > 0) {
                                this.messageDialogService.showConfirmDialog(MESSAGES.PROJECT_HAS_ERROR_MESSAGE,
                                    {
                                        okBtnMsg: "OK",
                                        cancelBtn: false
                                    }
                                )
                                subscriber.error();
                            } else {
                                subscriber.next(true);
                            }
                        } else if(result == DialogResult.NO) {
                            changedSubprojectMap.clear();
                            this.getProjectSubprojectsObservable(project.prjId, project.selectedComparisonVersion.compId)
                                .subscribe(data => {
                                    subscriber.next(false);
                                },error => subscriber.error(error));
                        }
                    }
                )
            } else {
                subscriber.next(false);
            }
        });
    }

    /**
     * Function saves subprojects if there is any change
     * @param project
     * @param changedSubprojectMap
     * @param subprojectErrors
     */
    public saveChangedSubprojects(project: Project, changedSubprojectMap : Map<string,Subproject>, subprojectErrors: string[]) {
        return  new Observable<Subproject[]>(subscriber => {
            this.detectDataChanges(project,changedSubprojectMap,subprojectErrors).subscribe(dataChanged => {
                if (dataChanged) {
                    this.loadingIndicatorService.show();
                    let subProjects = project.subProjects.filter(subproject => changedSubprojectMap.has(subproject.mcrMasterData.mcrSubProjectId) );
                    this.subprojectSanboxService.subprojectService.saveSubprojects(subProjects,project.prjId).subscribe(data => {
                        changedSubprojectMap.clear();
                        this.loadingIndicatorService.hide();
                        this.updateProjectData(project,data);
                        this.updateSubprojectData(data,project.selectedComparisonVersion.compId);
                        subscriber.next(data);
                    }, error => {
                        this.loadingIndicatorService.hide();
                        changedSubprojectMap.clear();
                        this.handleSavingError(project,error);
                        subscriber.next(null);
                    });
                } else {
                    subscriber.next([]);
                }
            });
        });
    }

    private handleSavingError(project:Project,error:any) {
        if (error.error && error.error.errorCode == ServiceErrorCode.OUT_DATED_DATA) {
            this.messageDialogService.showConfirmDialog(MESSAGES.PROJECT_SAVE_CONFLICT_ERROR,
                {
                    okBtnMsg: "OK",
                    cancelBtn: false
                }
            ).subscribe((ok: boolean) => {
                this.getProjectSubprojects(project.prjId, project.selectedComparisonVersion.compId);
            });
        } else {
            this.snackBar.error(MESSAGES.PROJECT_SAVE_ERROR);
            project.selectedComparisonVersion = project.originalComparisonVersion;
            this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({},project)));
        }
    }

    /**
     * Function fetches all currencies from backend.
     */
    private fetchCurrencies(): Observable<Currency[]> {
        this.store.dispatch(new CurrencyActions.LoadBeginAction());
        return  new Observable<Currency[]>(subscriber => {
            this.subprojectSanboxService.currencyService.getCurrencies().subscribe(
                data=> {
                    const sortedData = this.sortCurrencies(data);
                    this.store.dispatch(new CurrencyActions.LoadSuccessAction(sortedData))
                    subscriber.next(sortedData);
                }
                , error => {
                    this.store.dispatch(new CurrencyActions.LoadFailureAction(error))
                    subscriber.error(error);
                });
        });
    }

    /**
     * Sorts currency list by currency code
     * @param currencies
     */
    private sortCurrencies(currencies: Currency[]) {
        return currencies.sort((currency1:Currency,currency2:Currency)=>{
            if(currency1.code < currency2.code) { return -1; }
            if(currency1.code > currency2.code) { return 1; }
            return 0;
        });
    }

    /**
     * Fetch currency rates based on currency list.
     * @param years
     * @param currencies
     * @param compVersion
     */
    private fetchCurrencyRates(years: Array<number>,currencies:Array<number>,compVersion?: number){
        this.store.dispatch(new CurrencyRateActions.LoadBeginAction());
        return  new Observable<CurrencyRate[]>(subscriber => {
            this.subprojectSanboxService.currencyService.getExchangeRates(years,compVersion,currencies).subscribe(
                data=> {
                    this.store.dispatch(new CurrencyRateActions.LoadSuccessAction(data));
                    subscriber.next(data);
                }
                , error => {
                    this.store.dispatch(new CurrencyRateActions.LoadFailureAction(error));
                    subscriber.error(error);
                });
        });

    }

    /**
     * Fetch all currency & rates and put to store.
     * @param years
     * @param compVersion
     */
    private fetchFullCurrencyRates(years: Array<number>,compVersion?: number){
        this.store.dispatch(new CurrencyRateActions.LoadFullCurrencyRatesBeginAction());
        this.subprojectSanboxService.currencyService.getExchangeRates(years,compVersion).subscribe(
            data=> {
                this.store.dispatch(new CurrencyRateActions.LoadFullCurrencyRatesSuccessAction(data));
            }
            , error => {
                this.store.dispatch(new CurrencyRateActions.LoadFullCurrencyRatesFailureAction(error));
            });
    }

    private fetchForecastExRates(currencyIdList?: Array<number>){
        this.store.dispatch(new CurrencyRateActions.LoadForecastRatesBeginAction());
        this.subprojectSanboxService.currencyService.getCurentForecastExchangeRates(currencyIdList).subscribe(
            data=> {
                this.store.dispatch(new CurrencyRateActions.LoadForecastRatesSuccessAction(data));
            }
            , error => {
                this.store.dispatch(new CurrencyRateActions.LoadForecastRatesFailureAction(error));
            });
    }


    /**
     * Function handles to save latest project data change to database.
     */
    private saveSubprojectOfProject(prjId : number, subprojects: Subproject[]){
        return new Observable<Subproject[]>(subscriber => {
            this.store.dispatch(new ProjectActions.SaveAction());
            this.subprojectSanboxService.subprojectService.saveSubprojects(subprojects,prjId).subscribe(data => {
                this.store.dispatch(new ProjectActions.SaveSuccessAction());
                subscriber.next(data);
            }, error => {
                this.store.dispatch(new ProjectActions.SaveFailureAction(error));
                subscriber.error(error);
            });
        });

    }

    /**
     * Function converts project values to new currency and calculates project value table by subproject values.
     * @param project
     */
    private updateProjectDataTable(project:Project, actualDataSum: ActualData[], currencyId? : number): Observable<Project> {
        return new Observable<Project>(subscriber => {
            if (this.shouldConvertCurrency(project,currencyId ? currencyId : project.selectedCurrency.curId)) {
                this.convertProjectValuesToNewCurrency(project, currencyId ? currencyId : project.selectedCurrency.curId).subscribe(data => {
                    if (project) {
                        project.dataTable = this.calculateProjectDataTable(project,data);
                        if (project.selectedComparisonVersion.compId == ComparisonVersionType.ACTUAL) {
                            this.updateActualData(project,actualDataSum);
                        }
                    }
                    subscriber.next(project);
                });
            } else {
                if (project) {
                    project.dataTable = this.calculateProjectDataTable(project,project.subProjects);

                    if (project.selectedComparisonVersion.compId == ComparisonVersionType.ACTUAL) {
                        this.updateActualData(project,actualDataSum);
                    }

                }
                subscriber.next(project);
            }
        });
    }

    /**
     * Updates project values with actual data.
     * @param project
     * @param actualDataSum
     */
    private updateActualData(project:Project, actualDataSum: ActualData[]) {
        if (!!actualDataSum) {
            actualDataSum.forEach(actualData => {
                let dataRow = project.dataTable.find(row => row.year == actualData.year);
                if (dataRow) {
                    dataRow.actualCost = actualData.actualCostValue;
                    dataRow.actualPAO = actualData.actualPaoValue;
                    dataRow.actualOTP = actualData.actualOtpValue;
                } else {
                    let newValue = this.createNewProjectValue();
                    newValue.year = actualData.year;
                    newValue.actualCost = actualData.actualCostValue;
                    newValue.actualPAO = actualData.actualPaoValue;
                    newValue.actualOTP = actualData.actualOtpValue;
                    project.dataTable.push(newValue);
                }
            });

            project.dataTable.sort((projectValue1: ProjectValue, projectValue2: ProjectValue) => projectValue1.year - projectValue2.year);
        }
    }

    /**
     * Initializes an empty ProjectValue
     */
    private createNewProjectValue(): ProjectValue {
        let projectValue = new ProjectValue();
        projectValue.year = null;
        projectValue.currentCost = null;
        projectValue.actualCost = null;
        projectValue.currentOTP = null;
        projectValue.currentOTPDtl = null;
        projectValue.actualOTP = null;
        projectValue.currentPAO = null;
        projectValue.currentPAODtl = null;
        projectValue.actualPAO = null;
        projectValue.currentOTPPAO = null;
        projectValue.actualOTPPAO = null;
        projectValue.currentCSS = null;
        projectValue.actualCSS = null;
        return  projectValue;
    }

    /**
     * Function to calculate project total PAO & OTP by subprojects' PAO & OTP
     */
    public calculateProjectTotalContractualAgreedValues() {
        combineLatest(
            this.getProjectDataFromStore(),
            this.getForecastExRatesFromStore()
        ).pipe(
            first()
        ).subscribe(([project,forecastExRates]) => {
            if (!forecastExRates || forecastExRates.length <= 0) {
                this.subprojectSanboxService.currencyService.getCurentForecastExchangeRates(this.getCurrencyList(project)).subscribe(rates => {
                    this.updateProjectTotalContractualValues(project,rates);
                    this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({}, project)));
                });
            } else {
                this.updateProjectTotalContractualValues(project,forecastExRates);
                this.store.dispatch(new ProjectActions.ChangeAction(Object.assign({}, project)));
            }
        });
    }

    /**
     * Function calculates total contractual OTP/PAO of project
     * based on contractual OTP/PAO of subprojects
     * @param project
     */
    private updateProjectTotalContractualValues(project : Project,rates: ForecastExRate[]) {
        let subprojects = project.subProjects;

        let totalContractualOPT = null;
        let totalContractualPAO = null;

        subprojects.forEach(subProject => {
            if (subProject.cssMasterData.contractualOTP != null) {

                let value = subProject.cssMasterData.contractualOTP;
                if (project.selectedCurrency.curId != subProject.cssMasterData.currencyId) {
                    value = convertValueToNewForecastRate(value,rates,subProject.cssMasterData.currencyId,project.selectedCurrency.curId);
                }

                totalContractualOPT = totalContractualOPT == null ? value : totalContractualOPT + value;
            }

            if (subProject.cssMasterData.contractualPAO != null) {

                let value = subProject.cssMasterData.contractualPAO;
                if (project.selectedCurrency.curId != subProject.cssMasterData.currencyId) {
                    value = convertValueToNewForecastRate(value,rates,subProject.cssMasterData.currencyId,project.selectedCurrency.curId);
                }

                totalContractualPAO = totalContractualPAO == null ? value : totalContractualPAO + value;
            }
        });

        project.totalContractualOTP = totalContractualOPT;
        project.totalContractualPAO = totalContractualPAO;
    }

    /**
     * Function calculates project value table by subproject values.
     * @param project
     * @param subprojects
     */
    private calculateProjectDataTable(project: Project,subprojects:Subproject[]) {
        let projectDataTable = [];
        let mapValues = new Map<number, ProjectValue>();
        subprojects.forEach(subProject => {
            const dataTable = subProject.getFormattedData();

            for (let i = 0; i < dataTable.length; i++) {
                if (mapValues.has(dataTable[i].year)) {
                    let value = mapValues.get(dataTable[i].year);

                    if (dataTable[i].currentCost) {
                        value.currentCost += dataTable[i].currentCost;
                    }

                    // Actual data will be calculated in another process.
                    if (project.selectedComparisonVersion.compId != ComparisonVersionType.ACTUAL) {
                        if(dataTable[i].actualCost) {
                            value.actualCost += dataTable[i].actualCost;
                        }

                        if (dataTable[i].actualOTP) {
                            value.actualOTP += dataTable[i].actualOTP;
                        }

                        if (dataTable[i].actualPAO) {
                            value.actualPAO += dataTable[i].actualPAO;
                        }
                    }

                    if (dataTable[i].currentOTP) {
                        value.currentOTP += dataTable[i].currentOTP;
                    }

                    if (dataTable[i].currentPAO) {
                        value.currentPAO += dataTable[i].currentPAO;
                    }

                    mapValues.set(dataTable[i].year, value);
                } else {
                    mapValues.set(dataTable[i].year, this.createNewProjectFrom(dataTable[i],project));
                }
            }
        });

        mapValues.forEach((value, key) => {
            projectDataTable.push(value)
        });

        return projectDataTable.sort((projectValue1: ProjectValue, projectValue2: ProjectValue) => projectValue1.year - projectValue2.year);
    }

    /**
     * Function copies project values to subprojects.
     * @param subprojects
     * @param project
     */
    private overwriteSubprojects(subprojectVersions: SubProjectVersion[], project: Project){
        let results : SubProjectVersion[] = [];
        if(subprojectVersions) {
            for(let i = 0; i < subprojectVersions.length ; i++) {
                let subprojectVersion = subprojectVersions[i];
                let subproject = subprojectVersion.versionSubprojectMap.get(project.selectedComparisonVersion.compId);
                if (this.canOverwriteSubproject(subproject)) {
                    if (project.startPAO) {
                        subproject.cssMasterData.startPAO = project.startPAO;
                    }

                    if (project.endPAO) {
                        subproject.cssMasterData.endPAO = project.endPAO;
                    }

                    if (project.otpRate && project.otpRate > 0.0) {
                        subproject.cssMasterData.otpRate = project.otpRate;
                    }

                    if (project.paoRate && project.paoRate > 0.0) {
                        subproject.cssMasterData.paoRate = project.paoRate;
                    }


                    if (project.contractSigning) {
                        subproject.cssMasterData.contractSigning = project.contractSigning;
                    }
                }

                this.subprojectSanboxService.updateProject(project, subproject);
                subprojectVersion = Object.assign({},subprojectVersion);
                results.push(subprojectVersion);
            }

            this.resetProjectCSSMasterDataValues(project);
        }

        return results;
    }

    /**
     * Function overwrites ContractualAgreed OTP/PAO to all subprojects
     * Currency conversion is used when project currency is different from subproject currencies.
     * @param subprojectVersions
     * @param project
     * @param rates
     */
    private overwriteContractualAgreedValuesToSubprojects(subprojectVersions: SubProjectVersion[], project: Project,rates: ForecastExRate[]){
        let results : SubProjectVersion[] = [];
        if(subprojectVersions) {
            let contractualPAOSum = 0; //sum of allocated PAO value
            let contractualOTPSum = 0; //sum of allocated OTP value

            for(let i = 0; i < subprojectVersions.length ; i++) {
                let subprojectVersion = subprojectVersions[i];
                let subproject = subprojectVersion.versionSubprojectMap.get(project.selectedComparisonVersion.compId);

                // Last subproject : allocated value = project value - sum of allocated value
                if (i == subprojectVersions.length - 1) {
                    if (!!project.contractualOTP) {
                        this.allocateContractualAgreedValueForLastSubproject('currentOTP', project.contractualOTP, contractualOTPSum, project, subproject, rates);
                    }

                    if(!!project.contractualPAO ) {
                        this.allocateContractualAgreedValueForLastSubproject('currentPAO', project.contractualPAO, contractualPAOSum, project, subproject, rates);
                    }
                } else {
                    if (!!project.contractualOTP) {
                        contractualOTPSum += this.allocateContractualAgreedValue('currentOTP', project.contractualOTP, project, subproject, rates);
                    }

                    if(!!project.contractualPAO ) {
                        contractualPAOSum += this.allocateContractualAgreedValue('currentPAO', project.contractualPAO, project, subproject, rates);
                    }
                }

                this.subprojectSanboxService.updateProject(project, subproject);

                subprojectVersion = Object.assign({},subprojectVersion);
                results.push(subprojectVersion);
            }

            this.resetProjectCSSMasterDataValues(project);
            this.calculateProjectTotalContractualAgreedValues();
        }

        return results;
    }

    /**
     * Function allocates contractual agreed opt/pao value at project level to
     * a subproject which is not last one in subproject list.
     * Returns rounded value after allocation.
     * @param attributeName
     * @param value
     * @param project
     * @param subproject
     * @param rates
     */
    private allocateContractualAgreedValue(attributeName: string, value: number, project: Project, subproject: Subproject, rates: ForecastExRate[]) {
        let allocatedValue = this.overwriteContractualAgreedValue(attributeName, value, project, subproject, rates);
        if (this.canOverwriteContractualAgreedValue(subproject, attributeName)) {
            this.setContractualAgreedValue(attributeName, allocatedValue, subproject);
        }
        return this.convertValueToProjectCurrency(allocatedValue ? allocatedValue : 0, project, subproject, rates);
    }

    /**
     * Function allocates contractual agreed opt/pao value at project level to
     * subproject which is last one in subproject list.
     * @param attributeName
     * @param value
     * @param sumValue
     * @param project
     * @param subproject
     * @param rates
     */
    private allocateContractualAgreedValueForLastSubproject(attributeName: string, value: number, sumValue: number, project: Project, subproject: Subproject, rates: ForecastExRate[]) {
        let remainingValue = value ? value - sumValue : 0;
        let allocatedValue = this.convertValueToSubProjectCurrency(remainingValue, project, subproject, rates)
        if (this.canOverwriteContractualAgreedValue(subproject, attributeName)) {
            this.setContractualAgreedValue(attributeName, allocatedValue, subproject);
        }
    }

    /**
     * Function sets value to contractual otp/pao attributes based on attribute name .
     * @param attributeName
     * @param value
     * @param subproject
     */
    private setContractualAgreedValue(attributeName: string, value : number,subproject: Subproject) {
        if (attributeName == 'currentOTP') {
            subproject.cssMasterData.contractualOTP = value;
        }

        if (attributeName == 'currentPAO') {
            subproject.cssMasterData.contractualPAO = value;
        }
    }

    /**
     * Function handles to overwrite values for ContractualAgreed OTP & PAO
     * @param attributeName
     * @param value
     * @param project
     * @param subproject
     */
    private overwriteContractualAgreedValue(attributeName: string,value: number,project: Project, subproject: Subproject, rates: ForecastExRate[]) {
        let otpSubprojectSum = getTotalValueOf(attributeName,subproject.getFormattedData());
        let otpProjectSum = getTotalValueOf(attributeName,project.dataTable);

        if( project.selectedCurrency.curId != subproject.cssMasterData.currencyId) {
            otpProjectSum = convertValueToNewForecastRate(otpProjectSum,rates,project.selectedCurrency.curId,subproject.cssMasterData.currencyId);
            value = convertValueToNewForecastRate(value,rates,project.selectedCurrency.curId,subproject.cssMasterData.currencyId);
        }

        if (otpProjectSum != 0) {
            return Math.round( (value/otpProjectSum)*otpSubprojectSum) ;
        }
        return null;
    }

    /**
     * Converts a value to project currency with given rates.
     * @param value
     * @param project
     * @param subproject
     * @param rates
     */
    private convertValueToProjectCurrency(value: number,project: Project, subproject: Subproject, rates: ForecastExRate[]) {
        if( project.selectedCurrency.curId != subproject.cssMasterData.currencyId) {
            return convertValueToNewForecastRate(value,rates,subproject.cssMasterData.currencyId,project.selectedCurrency.curId);
        }

        return value;
    }

    /**
     * Converts a value to subproject currency with given rates.
     * @param value
     * @param project
     * @param subproject
     * @param rates
     */
    private convertValueToSubProjectCurrency(value: number,project: Project, subproject: Subproject, rates: ForecastExRate[]) {
        if( project.selectedCurrency.curId != subproject.cssMasterData.currencyId) {
            return convertValueToNewForecastRate(value,rates,project.selectedCurrency.curId,subproject.cssMasterData.currencyId);
        }

        return value;
    }

    /**
     * Function reset CSS master data fields on project level.
     * @param project
     */
    private resetProjectCSSMasterDataValues(project: Project) {
        project.startPAO = null;
        project.endPAO = null;
        project.otpRate = null;
        project.paoRate = null;
        project.contractSigning = null;
        project.contractualPAO = null;
        project.contractualOTP = null;
    }

    /**
     * Function gets subproject data from backend by Project ID and
     * updates subproject value to project.
     * @param projectId
     * @param compareVersion
     */
    private getProjectSubprojects(projectId: number, compareVersion : number) {
        this.store.dispatch(new SubprojectLoading());
        this.getSubprojectData(projectId,compareVersion).subscribe( (data: SubProjectVersion[]) => {
            this.store.dispatch(new SubprojectCompareVersionChanged(data));
            this.store.dispatch(new ProjectActions.DiscardSuccessAction());
        }, error => {
            if (error.error && error.error.errorCode == ServiceErrorCode.RATE_NOT_FOUND) {
                this.getSubprojectData(projectId,compareVersion, false).subscribe( (data: SubProjectVersion[]) => {
                    this.store.dispatch(new SubprojectCompareVersionChanged(data));
                    this.store.dispatch(new ProjectActions.DiscardSuccessAction());
                }, error => {
                    this.store.dispatch(new SubprojectLoadingFailure(error));
                });
            } else {
                this.store.dispatch(new SubprojectLoadingFailure(error));
            }
        });
    }

    /**
     * Function gets subproject data and updates subproject value to project.
     * Returns Observable of SubProjectVersion[] which can be subscribed to get data.
     * @param projectId
     * @param compareVersion
     */
    private getProjectSubprojectsObservable(projectId: number, compareVersion : number) {
        return new Observable<SubProjectVersion[]>( subscriber => {
            this.store.dispatch(new SubprojectLoading());
            this.getSubprojectData(projectId,compareVersion).subscribe( (data: SubProjectVersion[]) => {
                this.store.dispatch(new SubprojectCompareVersionChanged(data));
                subscriber.next(data);
            }, error => {
                if (error.error && error.error.errorCode == ServiceErrorCode.RATE_NOT_FOUND) {
                    this.getSubprojectData(projectId,compareVersion, false).subscribe( (data: SubProjectVersion[]) => {
                        this.store.dispatch(new SubprojectCompareVersionChanged(data));
                        subscriber.next(data);
                    }, error => {
                        this.store.dispatch(new SubprojectLoadingFailure(error));
                        subscriber.error(error);
                    });
                } else {
                    this.store.dispatch(new SubprojectLoadingFailure(error));
                    subscriber.error(error);
                }
            });
        });
    }

    /**
     * Function gets subproject data and handles data response.
     * Returns Observable of SubProjectVersion[] which can be subscribed to get data.
     * @param projectId
     * @param compareVersion
     * @param fetchActual
     */
    private getSubprojectData(projectId: number, compareVersion : number, fetchActual: boolean = true): Observable<SubProjectVersion[]> {
        if (compareVersion == ComparisonVersionType.ACTUAL && fetchActual) {
            return forkJoin(
                this.subprojectSanboxService.subprojectService.getProjectSubprojects(projectId, compareVersion),
                this.subprojectSanboxService.fetchAllSubprojectActualData(projectId)
            )
                .pipe( map( ([subprojects,subprojectActualDataArray]) => {
                    return this.handleSubprojectDataResponse(projectId,compareVersion,subprojects,subprojectActualDataArray);
                }));
        }

        return this.subprojectSanboxService.subprojectService.getProjectSubprojects(projectId, compareVersion)
            .pipe( map( (subprojects: Subproject[]) => {
                return this.handleSubprojectDataResponse(projectId,compareVersion,subprojects,[]);
            }));
    }

    /**
     * Function updates relevant data model with new changes of subproject data.
     * Returns sorted subProjectVersion array which is a wrapper of subproject array.
     * @param projectId
     * @param compareVersion
     * @param subprojects
     */
    private handleSubprojectDataResponse(projectId: number, compareVersion : number,subprojects: Subproject[],subprojectActualDataArray: SubprojectActualData[]): SubProjectVersion[] {
        this.getApprovalPermissions(projectId);
        this.getButtonsVisibility(subprojects);

        if (compareVersion == ComparisonVersionType.ACTUAL) {
            subprojects.forEach(subproject => {
                this.subprojectSanboxService.updateSubprojectActualData(subproject,subprojectActualDataArray);
            });
        }

        let subProjectVersionArray : SubProjectVersion[] = [];
        this.updateSubprojectVersionData(subProjectVersionArray,subprojects,compareVersion);
        this.getProjectDataFromStore().pipe(  first()).subscribe(project=> {
            this.getCombinedProjectData(project,compareVersion, subProjectVersionArray);
        })


        // Sort sub projects ascendant by project id.
        let sortedData: SubProjectVersion[] = this.sortSubProjectVersion(subProjectVersionArray);
        return sortedData;
    }

    /**
     * Sorts SubProjectVersion by id
     * @param subProjectVersionArray
     */
    private sortSubProjectVersion(subProjectVersionArray: SubProjectVersion[]) {
        return subProjectVersionArray.sort( (subprojectVersion1,subprojectVersion2) => {
            if (subprojectVersion1.id < subprojectVersion2.id) return -1;
            else if (subprojectVersion1.id > subprojectVersion2.id) return 1;
            else return 0;
        });
    }

    /**
     * Function returns a list of Css Subprojects which are sent for approval
     * in case of Css Subprojects are not created in database.
     * @param project
     */
    public getNewCssSubprojectsForApproval(project: Project) {
        let newCssSubprojects = [];
        project.subProjects.forEach(subproject => {
            let cssMasterDataObj = subproject.cssMasterData;
            if (!!cssMasterDataObj && !cssMasterDataObj.cssSubProjectID &&
                !!cssMasterDataObj.invoiceCustomer.id &&
                !!cssMasterDataObj.specialSaleCompCode.id) {
                let cssSubprojectApproval = {
                    mcrSubPrjId: subproject.mcrMasterData.mcrPrjId,
                    invoiceCustomerId: cssMasterDataObj.invoiceCustomer.id,
                    specialSaleCompCode: cssMasterDataObj.specialSaleCompCode.id
                }
                newCssSubprojects.push(cssSubprojectApproval);
            }
        });

        return newCssSubprojects;
    }

    public getLastUpdatedSubProjects(project: Project): LastUpdatedSubProject[] {
        let lastUpdatedSubProjects: LastUpdatedSubProject[] = [];
        project.subProjects.forEach(subproject => {

            let cssMasterDataObj = subproject.cssMasterData;
            if (!!cssMasterDataObj && !!cssMasterDataObj.cssSubProjectID) {
                let lastUpdatedSubProject: LastUpdatedSubProject = {
                    cssSubProjectID: cssMasterDataObj.cssSubProjectID,
                    latestUpdDate: subproject.latestUpdDate
                }
                lastUpdatedSubProjects.push(lastUpdatedSubProject);
            }
        });

        return lastUpdatedSubProjects;
    }

    /**
     * Function updates existing subprojects with new subprojects.
     * @param subprojects
     * @param compareVersion
     */
    private updateSubprojectData(subprojects: Subproject[], compareVersion : number) {
        return combineLatest(
            this.fromStore.subproject.subProjectVersions$
        ).pipe(
            first()
        ).subscribe(([subProjectVersions]) => {
            let subProjectVersionArray: SubProjectVersion[] = subProjectVersions ? subProjectVersions : [];
            let result = this.updateSubprojectVersionData(subProjectVersionArray, subprojects, compareVersion);

            // Sort sub projects ascendant by project id.
            let sortedData = this.sortSubprojectVersionData(result);
            this.store.dispatch(new SubprojectChanged(sortedData));
        });
    }

    /**
     * Function updates project with given subproject list.
     * @param project
     * @param subprojects
     */
    private updateProjectData(project: Project,subprojects: Subproject[]) {
        subprojects.forEach(subproject => {
            this.subprojectSanboxService.updateProject(project,subproject);
        })
    }

    /**
     * Function updates Css subproject data after approval
     * @param data
     * @param compareVersion
     */
    public updateCssSubprojectData(data: ApprovalResponse,compareVersion : number) {
        if (!!data && !!data.createdCssSubProjects && data.createdCssSubProjects.length > 0) {
            let subProjects: Subproject[] = data.createdCssSubProjects.map<Subproject>((cssSubproject:CssSubprojectApprovalResponse) => {
                let subproject: Subproject = new Subproject();
                subproject.cssMasterData = cssSubproject.cssMasterData;
                subproject.updUser = cssSubproject.updUser;
                subproject.lastChangeDate = cssSubproject.lastChangeDate as any;
                subproject.latestUpdDate = cssSubproject.latestUpdDate;

                let mcrMasterData = new McrMasterData();
                mcrMasterData.mcrPrjId = cssSubproject.mcrSubProjectId;
                subproject.mcrMasterData = mcrMasterData;

                return subproject;
            });

            if (subProjects.length > 0) {
                return combineLatest(
                    this.fromStore.subproject.subProjectVersions$
                ).pipe(
                    first()
                ).subscribe(([subProjectVersions]) => {
                    let subProjectVersionArray: SubProjectVersion[] = subProjectVersions ? subProjectVersions : [];
                    let result = this.updateCssSubprojectDataChange(subProjectVersionArray, subProjects, compareVersion);

                    // Sort sub projects ascendant by project id.
                    let sortedData = this.sortSubprojectVersionData(result);
                    this.store.dispatch(new SubprojectChanged(sortedData));
                });
            }
        }
    }

    /**
     * Function updates ApprovalDialogData with latest changes from Subproject list
     * @param subprojects
     * @param approvalDialogData
     */
    public updateApprovalDialogData(subprojects: Subproject[], approvalDialogData: ApprovalDialogData) {
        subprojects.forEach(subproject => {
            if (!!subproject.cssMasterData && !!subproject.cssMasterData.cssSubProjectID) {
                if (!!approvalDialogData.lastUpdatedSubProjects) {
                    approvalDialogData.lastUpdatedSubProjects.forEach(data => {
                        if (data.cssSubProjectID == subproject.cssMasterData.cssSubProjectID) {
                            data.latestUpdDate = subproject.latestUpdDate;
                        }
                    });
                } else {
                    let lastUpdatedSubProject: LastUpdatedSubProject = {
                        cssSubProjectID: subproject.cssMasterData.cssSubProjectID,
                        latestUpdDate: subproject.latestUpdDate
                    };
                    approvalDialogData.lastUpdatedSubProjects = approvalDialogData.lastUpdatedSubProjects ? approvalDialogData.lastUpdatedSubProjects : [];
                    approvalDialogData.lastUpdatedSubProjects.push(lastUpdatedSubProject);

                    // This case already does not need cssSubprojects since the subproject has been saved successfully.
                    approvalDialogData.cssSubprojects = null;
                }
            }
        });
        return approvalDialogData;
    }

    /**
     * Sorts SubProjectVersion data by project id.
     * @param subProjectVersion
     */
    private sortSubprojectVersionData(subProjectVersion: SubProjectVersion []) {

        // Sort sub projects ascendant by project id.
        return subProjectVersion.sort((subprojectVersion1, subprojectVersion2) => {
            if (subprojectVersion1.id < subprojectVersion2.id) return -1;
            else if (subprojectVersion1.id > subprojectVersion2.id) return 1;
            else return 0;
        });
    }

    /**
     * Function triggers Save/Button to be shown if at least one subproject is visible
     * @param subproject
     */
    private getButtonsVisibility(subproject: Subproject[]) {
        if(subproject) {
            for(let i=0;i<subproject.length;i++) {
                /* if only one subproject is writable return true */
                if(this.readWriteHelper.getAccessRights(subproject[i].cssMasterData.ifrsVersionId).isWritable) {
                    this.store.dispatch(new ProjectActions.ProjectButtonsVisibility(true));
                    break;
                }
            }
        }
    }

    /**
     * Function loads approval permissions for all subprojects
     * @param mcrProjectId
     */
    private getApprovalPermissions(mcrProjectId :number) {
        this.approvalService.getApprovalPermissions(mcrProjectId).subscribe(data => {
            this.store.dispatch(new ProjectActions.LoadApprovalPermissions(data));
        });
    }

    /**
     * Function creates new project from a given project value object.
     * @param originalProjectValue
     * @param project
     */
    private createNewProjectFrom(originalProjectValue : ProjectValue, project: Project){
        let projectValue = new ProjectValue();
        projectValue.year = originalProjectValue.year;
        projectValue.currentCost = originalProjectValue.currentCost;

        projectValue.actualCost = null;
        projectValue.actualOTP = null;
        projectValue.actualPAO = null;
        if(project.selectedComparisonVersion.compId != ComparisonVersionType.ACTUAL) {
            projectValue.actualCost = originalProjectValue.actualCost;
            projectValue.actualOTP = originalProjectValue.actualOTP;
            projectValue.actualPAO = originalProjectValue.actualPAO;
        }

        projectValue.currentOTP = originalProjectValue.currentOTP;
        projectValue.currentOTPDtl = originalProjectValue.currentOTPDtl ? originalProjectValue.currentOTPDtl : new CurrentOTP();

        projectValue.currentPAO = originalProjectValue.currentPAO;
        projectValue.currentPAODtl = originalProjectValue.currentPAODtl ? originalProjectValue.currentPAODtl : new CurrentPAO();

        return projectValue;
    }
}
