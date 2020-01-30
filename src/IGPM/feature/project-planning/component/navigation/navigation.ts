/*
 * Copyright 2019 (c) All rights by Robert Bosch GmbH.
 * We reserve all rights of disposal such as copying and passing on to third parties.
 */

import {
    Component,
    OnInit,
    EventEmitter,
    Output,
    Input,
    ChangeDetectionStrategy
} from '@angular/core';
import { ProjectNavigation } from 'src/app/shared';
import { ProjectNavigationItem } from 'src/app/shared/business-domain/project-planning/project-navigation-item.model';

@Component({
    selector: 'css-project-navigation',
    templateUrl: './project-navigation.component.html',
    styleUrls: ['./project-navigation.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectNavigationComponent implements OnInit {

    /**
     * Variable used to hold project navigation data.
     */
    private navigation: ProjectNavigation;

    /**
     * Variable contains list of all project navigation items.
     */
    public subProjects: ProjectNavigationItem[] = [];

    /**
     * Variable used to hold selected index of project navigation tree.
     */
    public selectedItemIndex: number = -1;

    /**
     * Variable used to hold selected project navigation item in project navigation tree.
     */
    public selectedPrjNavigationItem: ProjectNavigationItem;

    constructor() { }

    ngOnInit() {
    }

    /**
     * Event which notifies when a project navigation item is selected
     */
    @Output() onNavigationItemSelected: EventEmitter<String> = new EventEmitter<String>();

    /**
     * Component attribute sets project navigation data.
     * @param data
     */
    @Input()
    set projectNavigation(data: ProjectNavigation) {
        if (data && data.subProjects) {
            this.subProjects = data.subProjects;
        }
        this.navigation = data;
    }

    /**
     * Component attribute sets selected project navigation item.
     */
    @Input()
    set selectedItem(item: ProjectNavigationItem) {
        this.selectedPrjNavigationItem = item;
        if (!item) {
            this.selectedItemIndex = -1;
        } else {
            this.selectedItemIndex = this.subProjects.indexOf(item);
        }
    }

    /**
     * Component attribute indicates that data is loading.
     */
    @Input() isProgressStart;

    /**
     * Selects project navigation item at an index.
     * @param item of project navigation
     * @param index of selected item.
     */
    selectNavigation(item: any ,index: number) {
        this.selectedItemIndex = index;
        this.onNavigationItemSelected.emit(item);
    }

}

