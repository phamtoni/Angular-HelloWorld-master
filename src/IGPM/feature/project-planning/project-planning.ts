/*
 *  Copyright 2019 (c) All rights by Robert Bosch GmbH.
 *  We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {Component, OnInit, QueryList, ViewChild, ViewChildren} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BreadcrumbService} from '@igpm/core';
import {BehaviorSubject, combineLatest, Observable, Subject, Subscription} from 'rxjs';
import {
    ApprovalPermission,
    CurrencyRate,
    ForecastExRate,
    isIEOrEdgeBrowser,
    LoadingIndicatorService,
    LoadingIndicatorState,
    Project,
    ProjectError,
    ProjectErrorEvent,
    ProjectNavigation,
    ProjectNavigationItem,
    ProjectPlanningComparisonVersionChangeEvent,
    ProjectPlanningValueChangeEvent,
    ReadWriteHelper,
    Subproject,
    SubprojectData
} from 'src/app/shared';
import {ProjectPlanningSandboxService} from './project-planning-sandbox.service';
import {
    Currency,
    ProjectPlanningContractualAgreeOTPChangeEvent,
    ProjectPlanningContractualAgreePAOChangeEvent,
    ProjectPlanningCurrencyChangeEvent,
    ProjectPlanningEvent,
    SubprojectError,
    SubprojectErrorEvent,
    ApprovalDialogData
} from "../../shared/business-domain";
import {ScrollDispatcherService} from "../../shared/scroll-dispatcher/scroll-dispatcher.service";
import {ProjectComponent} from "./components/project/project.component";
import {SubprojectComponent} from "./components/subproject/subproject.component";
import {SubProjectVersion} from 'src/app/shared/business-domain';
import {ComponentCanDeactivate} from "../../shared/guard/component-can-deactivate";
import {MessageDialogService} from "../../shared/dialog/message-dialog.service";
import * as MESSAGES from "../../shared/constants/messages.constant";
import * as CONFIG from "../../shared/constants/config.constants";
import {ApprovalComponent} from "./components/approval/approval.component";
import {MatDialog} from "@angular/material";
import {takeWhile, tap} from "rxjs/operators";
import {ProjectNavigationComponent} from "./components/navigation/project-navigation.component";

@Component({
    selector: 'css-project-planning',
    templateUrl: './project-planning.component.html',
    styleUrls: ['./project-planning.component.scss']
})
export class ProjectPlanningComponent extends ComponentCanDeactivate implements OnInit {

    /**
     * Observable holds project navigation data.
     */
    projectNavigationItems$: Observable<ProjectNavigation> = this.sandbox.data.projectNavigation$;

    /**
     * Observable holds subprojects data.
     */
    subprojects$: Observable<SubProjectVersion[]> = this.sandbox.data.subProjectVersions$;

    /*
    * a array with all subprojects
    * */
    allSubprojects: SubProjectVersion[];

    project$: Observable<Project> = this.sandbox.data.project$;

    /**
     * Observable holds currency data.
     */
    currencies$: Observable<Currency> = this.sandbox.data.currencies$;

    /**
     * Observable holds loading state of project.
     */
    projectLoading$:Observable<boolean> = this.sandbox.data.projectLoading$;

    /**
     * Observable holds state of project discard.
     */
    projectDiscard$:Observable<boolean> = this.sandbox.data.projectDiscard$;

    /**
     * Observable holds loading state of currency Rate .
     */
    currencyRateLoading$: Observable<boolean> = this.sandbox.data.currencyRateLoading$;

    actualDataSumLoading$: Observable<boolean> = this.sandbox.data.actualDataSumLoading$;

    fullCurrencyRates$: Observable<CurrencyRate[]> = this.sandbox.data.fullCurrencyRates$;

    forecastExRates$: Observable<ForecastExRate[]> = this.sandbox.data.forecastExRates$;

    /**
     * Observable holds loading state of project navigation.
     */
    subprojectsLoading$:Observable<boolean> = this.sandbox.data.subprojectsloading$;

    /**
     * A flag indicates project navigation is loading.
     */
    projectNavigationLoading$: Observable<boolean> = this.sandbox.data.projectNavigationLoading$;

    /**
     * Observable holds selected project navigation item.
     */
    selectedNavItem$: Observable<ProjectNavigationItem> = this.sandbox.data.selectedNavItem$;

    /**
     * A flag indicates project content is in pin mode.
     * Only the sum table & action buttons are visible.
     */
    projectPinned: boolean;

    buttonsVisibility$ : Observable<boolean> = this.sandbox.data.buttonsVisibility$;

    approvalPermissions$: Observable<ApprovalPermission[]> = this.sandbox.data.approvalPermissions$;

    actualDataSumError$: Observable<boolean>;

    /**
     * ViewChild binds to ProjectComponent
     */
    @ViewChild('projectContent') projectComponent: ProjectComponent;

    @ViewChild('projectNavigationComponent') projectNavigationComponent: ProjectNavigationComponent;

    /**
     * ViewChildren binds to SubprojectComponent list.
     */
    @ViewChildren('subprojectComponent') subprojectComponents: QueryList<SubprojectComponent>;

    @ViewChild('pinnedProjectComponent') set pinnedProjectComponent(component: ProjectComponent) {
        this.pinnedComponent = component;
    }

    isProgressStart: boolean = false;

    /**
     * A flag indicates project is in pinned mode.
     */
    private pinnedComponent: ProjectComponent;

    /**
     * Variable used to contain main element
     */
    mainElem: any;

    /**
     * Array contains all subscriptions to observables.
     */
    subscriptions: Subscription[] = [];

    /**
     * A map contains latest subproject data changes.
     */
    changedSubprojectMap = new Map<string, Subproject>();

    /**
     * A map contains subproject has error.
     */
    subprojectErrorMap = new Map<string, SubprojectError>();

    subprojectErrors : string[] = [];

    /**
     * A map contains project has error.
     */
    projectErrorMap = new Map<string, ProjectError>();

    projectErrors : string[] = [];

    /**
     * subprojectErrors Observable
     */
    subprojectErrors$: Subject<string[]> = new Subject<string[]>();

    /**
     * buttonsDisabled Observable
     */
    buttonsDisabled$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(true);

    currentSelectedNavigationItem: ProjectNavigationItem;

    /**
     * A flag indicates if observable can be subscribed.
     */
    canSubscribe: boolean = true;

    /**
     * Default window size of visible subprojects
     */
    subrojectWindows : number = CONFIG.DEFAULT_SUBPROJECT_WINDOW_SIZE;

    constructor(
        private sandbox: ProjectPlanningSandboxService,
        public route: ActivatedRoute,
        private breadcrumbs: BreadcrumbService,
        private messageDialogService : MessageDialogService,
        private loadingIndicatorService: LoadingIndicatorService,
        public dialog: MatDialog,
        private readWriteHelper: ReadWriteHelper,
        private scrollDispatcher : ScrollDispatcherService){
        super()
    }

    ngOnInit() {
        this.breadcrumbs.setTemporaryTitleForRoute(this.route.snapshot, 'Project Planning');
        this.actualDataSumError$ = this.sandbox.getActualDataSumError();
        this.mainElem = this.scrollDispatcher.elementRef.nativeElement;

        this.scrollDispatcher.register((event) => {
            this.onScroll(event);
        }) ;

        let routeSub = this.route.params.subscribe( params => {

            const prjId = Number(this.route.snapshot.fragment);

            if (params.mcrProjectId) {
                this.sandbox.getProjectData(params.mcrProjectId, prjId);
            }
        });
        this.subscriptions.push(routeSub);

        let subprojectSub = this.subprojects$.subscribe( data => {
            this.allSubprojects = data ? data : this.getEmptySubprojects();

        });
        this.subscriptions.push(subprojectSub);

        let loadingSubscription = this.loadingIndicatorService.loadingIndicatorState
            .subscribe((state: LoadingIndicatorState) => {
                this.isProgressStart = state.show;
            });

        this.subscriptions.push(loadingSubscription);
    }

    getEmptySubprojects() : SubProjectVersion[] {
        let emptySubprojects : SubProjectVersion[] = [];
        let subproject = new Subproject();
        let subprojectVersion = new SubProjectVersion();
        subprojectVersion.versionSubprojectMap.set(0,subproject);
        emptySubprojects.push(subprojectVersion);

        return emptySubprojects;
    }


    ngAfterViewChecked(){
        this.detectError();
    }

    ngOnDestroy() {
        this.scrollDispatcher.deregister();
        this.subscriptions.forEach(subscription => subscription.unsubscribe);
        this.canSubscribe = false;
    }



    onScroll(event) {
        let mainContainerElem = event.target;
        this.mainElem = mainContainerElem;
        let projectElem = this.projectComponent.elementRef.nativeElement;
        let currentTop = event.target.scrollTop;
        let offsetTop = mainContainerElem.offsetTop;
        let currentPosition = offsetTop + currentTop;
        let projectPosition = projectElem.offsetTop + this.projectComponent.contentElemRef.nativeElement.offsetHeight;

        // Change selected project navigation item accordingly while scrolling.
        let offset = this.projectComponent.defaultMinHeight; // height of pinned project content in pixels e.g: 167
        this.selectNavigationItemAtPosition(currentPosition + offset);

        // Change project content to pinned mode if scroll position is over 2/3  of project position.
        if (currentPosition > projectPosition * 2/3 ){
            this.projectPinned = true;
        } else  {
            this.projectPinned = false;
        }
    }

    /**
     * Function handles when project navigation item is selected.
     * @param event
     */
    onNavigationItemSelected(event) {
        if (event && event.mcrId) {
            let navId = event.mcrId;
            this.currentSelectedNavigationItem = new ProjectNavigationItem(navId,null);
            let subProjectComp = this.subprojectComponents.find(component => component.subproject && component.subproject.mcrMasterData && component.subproject.mcrMasterData.mcrSubProjectId === navId);
            subProjectComp.isContentVisible = true;
            let el = subProjectComp.elementRef.nativeElement;
            if (el) {
                const offsetPadding = subProjectComp.paddingTop; // number of pixels needs to move back from element's offset
                setTimeout(() => {
                    if (isIEOrEdgeBrowser()) {
                        this.mainElem.scrollTop = el.offsetTop - offsetPadding;
                    } else {
                        this.mainElem.scrollTo(el.offsetLeft,el.offsetTop - offsetPadding);
                    }
                },100)
            }
        } else {
            this.navigationOnTop();
        }
    }

    /**
     * Function navigates to top when rocket button is clicked.
     */
    navigationOnTop(){
        let el: HTMLElement =  this.projectComponent.elementRef.nativeElement;
        if(isIEOrEdgeBrowser()) {
            this.mainElem.scrollTop = el.offsetTop - this.projectComponent.paddingTop;
        } else {
            this.mainElem.scrollTo(el.offsetLeft,el.offsetTop - this.projectComponent.paddingTop);
        }
    }

    /**
     * Function discards project data change and restores to original project data.
     * @param event
     */
    discardProjectValue(event: ProjectPlanningEvent) {
        console.log("Discard Event: ",event);
        const errors = this.subprojectErrors.concat(this.projectErrors);
        this.sandbox.discardProjectValue(event.project, this.changedSubprojectMap, errors)
            .pipe(
                takeWhile(() => this.canSubscribe)
            )
            .subscribe(isSuccess=> {
                if (isSuccess) {
                    this.subprojectErrors = [];
                    this.projectErrors = [];
                    this.subprojectErrors$.next(this.subprojectErrors);
                    this.buttonsDisabled$.next(true);
                }
            });
    }

    /**
     * Function saves project data.
     * @param event
     */
    saveProjectValue(event: ProjectPlanningEvent) {
        console.log("Save Event: ",event);
        if (this.subprojectErrors.length > 0 || this.projectErrors.length > 0) {
            this.messageDialogService.showConfirmDialog(MESSAGES.PROJECT_HAS_ERROR_MESSAGE,
                {
                    okBtnMsg: "OK",
                    cancelBtn: false
                }
            )
        } else {
            // Check if there is any data change
            if (this.changedSubprojectMap.size > 0) {
                let subProjects = event.project.subProjects.filter(subproject => this.changedSubprojectMap.has(subproject.mcrMasterData.mcrSubProjectId) );
                let saveProjectSub = this.sandbox.saveProject(event.project,subProjects).subscribe(data => {
                    this.changedSubprojectMap.clear();
                    this.subprojectErrors = [];
                    this.projectErrors = [];
                    this.subprojectErrors$.next(this.subprojectErrors);
                    this.buttonsDisabled$.next(true);
                });

                this.subscriptions.push(saveProjectSub);
            } else {
                this.buttonsDisabled$.next(true);
            }
        }
    }

    approveProject(event: ProjectPlanningEvent) {
        let project = event.project;
        let canApprove = this.readWriteHelper.getAccessRights(project.ifrsVersionId).isWritable;
        let newCssSubprojects = this.sandbox.getNewCssSubprojectsForApproval(project);
        let lastUpdatedSubProjects = this.sandbox.getLastUpdatedSubProjects(project);
        let approvalDialogData: ApprovalDialogData = {
            mcrProjectId: project.prjId,
            mcrSubProjectId: null,
            budId: project.divisionId,
            canApprove: canApprove,
            cssSubprojects: newCssSubprojects,
            isSubproject: false,
            project: project,
            lastUpdatedSubProjects: lastUpdatedSubProjects
        };

        this.saveAndApproveProject(approvalDialogData.project,approvalDialogData);
    }

    /**
     * Function handles project data change.
     * @param event
     */
    projectDataChanged(event: ProjectPlanningEvent) {
        if (event instanceof ProjectPlanningValueChangeEvent) {
            let project: Project = event.project;

            // In case of overwriting values to subprojects. Need to add all subprojects to changed map.
            project.subProjects.forEach(subproject => {
                if (this.sandbox.canOverwriteSubproject(subproject)){
                    this.subprojectChanged(subproject);
                }
            });

            if (event instanceof ProjectPlanningContractualAgreePAOChangeEvent ||
                event instanceof ProjectPlanningContractualAgreeOTPChangeEvent ) {
                this.sandbox.updateContractualAgreedValues(event.project);
            } else {
                this.sandbox.updateSubprojects(event.project);
            }
        }

        if(event instanceof ProjectPlanningComparisonVersionChangeEvent) {
            let compSwitchSub = this.sandbox.getComparisonValueSubprojects(event.project,this.changedSubprojectMap, this.subprojectErrors).subscribe(data => {
                if (data) {
                    this.subprojectErrors =  [];
                }
            });
            this.subscriptions.push(compSwitchSub);
        }

        if (event instanceof ProjectPlanningCurrencyChangeEvent) {
            this.sandbox.changeCurrency(event.project,event.project.selectedCurrency.curId);
        }
    }

    /**
     * Listens for subproject data change and store value to map.
     * @param subproject
     */
    subprojectChanged(subproject: Subproject) {
        this.changedSubprojectMap.set(subproject.mcrMasterData.mcrSubProjectId,subproject);
        this.buttonsDisabled$.next(false);
    }

    /**
     * Handles when CSS data has error.
     * @param errorData
     */
    cssDataHasError(errorData: SubprojectErrorEvent) {
        this.subprojectErrors = [];
        if (errorData) {
            let error = new SubprojectError();
            let subproject = errorData.subproject;
            if(this.subprojectErrorMap.has(subproject.mcrMasterData.mcrSubProjectId)) {
                error = this.subprojectErrorMap.get(subproject.mcrMasterData.mcrSubProjectId);
            }
            error.cssDataError = errorData;
            this.updateError(subproject,error);
            if( errorData && errorData.error ) {
                this.buttonsDisabled$.next(false);
            }
        }

        this.subprojectErrors$.next(this.subprojectErrors);
    }

    /**
     * Handles when project data has error.
     * @param errorData
     */
    projectHasError(errorData: ProjectErrorEvent) {
        this.projectErrors = [];
        if (errorData) {
            let error = new ProjectError();
            let project = errorData.project;
            let projectId = project.prjId.toString();
            if(this.projectErrorMap.has(projectId)) {
                error = this.projectErrorMap.get(projectId);
            }
            error.projectError = errorData;
            this.updateProjectError(project, error);
            if( errorData && errorData.error ) {
                this.buttonsDisabled$.next(false);
            }
        }
    }

    /**
     *  Handles when Subproject data has error.
     * @param errorData
     */
    subprojectDataHasError(errorData : any) {
        this.subprojectErrors = [];
        if (errorData) {
            let subproject = errorData.subproject;
            let error = new SubprojectError();
            if(this.subprojectErrorMap.has(subproject.mcrMasterData.mcrSubProjectId)) {
                error = this.subprojectErrorMap.get(subproject.mcrMasterData.mcrSubProjectId);
            }
            error.subprojectDataError = errorData;
            this.updateError(subproject,error);
            if( errorData && errorData.error ) {
                this.buttonsDisabled$.next(false);
            }
        }
        this.subprojectErrors$.next(this.subprojectErrors);
    }

    /**
     * Listens for subproject table value change
     * and updates project sum values.
     * @param subprojectData
     */
    subprojectValueChanged(subprojectData : SubprojectData[]) {
        if (subprojectData && subprojectData.length > 0) {
            this.sandbox.changeProjectValue();
            this.buttonsDisabled$.next(false);
        }
    }

    /**
     * Handles approval for subproject
     * @param approvalDialogData
     */
    subprojectApproveStarted(approvalDialogData: ApprovalDialogData) {
        this.saveAndApproveProject(approvalDialogData.project,approvalDialogData);
    }

    /**
     * Save pending changes before showing approval dialog.
     * @param project
     * @param approvalDialogData
     */
    saveAndApproveProject(project: Project, approvalDialogData: ApprovalDialogData) {
        if (this.subprojectErrors.length > 0 || this.projectErrors.length > 0) {
            this.messageDialogService.showConfirmDialog(MESSAGES.APPROVAL_HAS_ERROR_MESSAGE,
                {
                    okBtnMsg: "OK",
                    cancelBtn: false
                }
            )
        } else {
            this.sandbox.saveChangedSubprojects(project, this.changedSubprojectMap, this.subprojectErrors)
                .pipe(takeWhile(() => this.canSubscribe))
                .subscribe(subprojects => {
                    this.subprojectErrors = [];
                    if (subprojects) {
                        const dialogRef = this.dialog.open(ApprovalComponent, {
                            data: this.sandbox.updateApprovalDialogData(subprojects, approvalDialogData),
                            autoFocus: false,
                            disableClose: true
                        });

                        dialogRef.componentInstance.approveCompletedEvent
                            .pipe(takeWhile(() => this.canSubscribe)).subscribe((data: any) => {
                            this.sandbox.updateCssSubprojectData(data, project.selectedComparisonVersion.compId);
                        });

                        dialogRef.componentInstance.approveCompletedWithErrorEvent.pipe(takeWhile(() => this.canSubscribe)).subscribe((error: any) => {
                            if (!!error) {
                                error.project = project;
                                this.sandbox.handleConflictError(error);
                            }
                        });
                        dialogRef.afterClosed().pipe(takeWhile(() => this.canSubscribe)).subscribe();
                    }
                });
        }
    }

    /**
     * Function detects if the screen can be deactivated
     */
    canDeactivate():boolean{
        if (this.changedSubprojectMap.size > 0) {
            return false;
        }

        return true;
    }

    /**
     * Function finds approval permission for one specific subproject
     * @param subprojectVersion
     * @param project
     * @param approvalPermissions
     */
    getApprovalPermission(subprojectVersion: SubProjectVersion, project: Project, approvalPermissions: ApprovalPermission[]) {
        if(subprojectVersion && project && approvalPermissions) {
            let subproject = subprojectVersion.versionSubprojectMap.get(project.selectedComparisonVersion.compId);
            let approval =  approvalPermissions.find(permisson => permisson.mcrSubProjectId == subproject.mcrMasterData.mcrPrjId);
            return approval;
        }

        return  null;
    }

    /**
     * Function gets selected project navigation item when scrolling.
     * This function detects current scroll position if it belongs
     * to a subproject area.
     * @param position
     */
    private selectNavigationItemAtPosition(position: number) {
        let selectedSubProject = this.getSubprojectAtPosition(position);
        let mcrSubProjectId = selectedSubProject ? selectedSubProject.mcrMasterData.mcrSubProjectId : null;
        this.currentSelectedNavigationItem = new ProjectNavigationItem(mcrSubProjectId,null);

        // If selectedSubProject is null, project level will be selected.
        this.sandbox.selectNavigationItem(selectedSubProject ? selectedSubProject.mcrMasterData.mcrSubProjectId: null);
    }

    /**
     * Function detects position of scroll view and
     * returns a subproject which belongs to that position
     * @param position
     */
    private getSubprojectAtPosition(position: number): Subproject {
        let componentArray = [];
        this.subprojectComponents.map(component => componentArray.push(component));

        //Sort sub projects ascendant by mcrSubProjectId.
        componentArray = componentArray.sort( (mcrSubProjectId1,mcrSubProjectId2) => {
            if (mcrSubProjectId1.subproject.mcrMasterData.mcrSubProjectId < mcrSubProjectId2.subproject.mcrMasterData.mcrSubProjectId) return -1;
            else if (mcrSubProjectId1.subproject.mcrMasterData.mcrSubProjectId > mcrSubProjectId2.subproject.mcrMasterData.mcrSubProjectId) return 1;
            else return 0;
        });

        // Detect if the position is in sub project area.
        for(let i = 0 ; i<  componentArray.length; i++) {
            let subprojectComponent = componentArray[i];
            let currentSubprojectElem = subprojectComponent.elementRef.nativeElement;
            let currentSubprojectPosition = currentSubprojectElem.offsetTop;
            if (i + 1 < componentArray.length) {
                let nextSubprojectElem = componentArray[i + 1].elementRef.nativeElement;
                let nextSubprojectPosition = nextSubprojectElem.offsetTop;
                if (position > currentSubprojectPosition && position <= nextSubprojectPosition) {
                    return subprojectComponent.subproject;
                }
            } else if (position > currentSubprojectPosition) {
                return componentArray[componentArray.length-1].subproject;
            }
        }

        return null;
    }

    /**
     * Function to handle updating main project on subprojects' OTP & PAO change
     */
    private onInputFieldDataChanged() {
        this.sandbox.calculateProjectTotalContractualAgreedValues();
    }

    /**
     * Function updates error list based on errors from sub components
     * @param subproject
     * @param error
     */
    private updateError(subproject: Subproject, error: SubprojectError) {
        this.subprojectErrorMap.set(subproject.mcrMasterData.mcrSubProjectId,error);
        this.subprojectErrorMap.forEach((error,mcrSubProjectId) => {
            if (error && error.cssDataError && error.cssDataError.error ||
                error && error.subprojectDataError && error.subprojectDataError.error
            ) {
                this.subprojectErrors.push(mcrSubProjectId);
            }
        });
    }

    /**
     * Function updates error based on errors from project components
     * @param project
     * @param error
     */
    private updateProjectError(project: Project, error: ProjectError) {
        this.projectErrorMap.set(project.prjId.toString(), error);
        this.projectErrorMap.forEach((error, prjId) => {
            if (error && error.projectError && error.projectError.error) {
                this.projectErrors.push(prjId);
            }
        });
    }

    /**
     * Function detects if current subproject at the index
     * is in visible range while scrolling.
     * @param index
     */
    isInVisibleSubprojectRange(index: number) {
        let selectedSubprojectIndex=  this.projectNavigationComponent.selectedItemIndex ;
        return  index >= selectedSubprojectIndex - this.subrojectWindows && index <= selectedSubprojectIndex + this.subrojectWindows;
    }

    /**
     * Detects errors on subproject components after UI completely renders
     */
    private detectError() {
        this.subprojectComponents.forEach(subprojectComp => {
            let subproject = subprojectComp.subproject;
            if(!!subproject.mcrMasterData.mcrSubProjectId && subprojectComp.cssMasterDataComponent && subprojectComp.cssMasterDataComponent.hasError) {
                let error = new SubprojectError();

                if(this.subprojectErrorMap.has(subproject.mcrMasterData.mcrSubProjectId)) {
                    error = this.subprojectErrorMap.get(subproject.mcrMasterData.mcrSubProjectId);
                }
                let errorData : SubprojectErrorEvent = {
                    subproject:  subprojectComp.subproject,
                    error: true
                };
                error.cssDataError = errorData;
                this.updateError(subproject,error);
            }
        });
    }
}
