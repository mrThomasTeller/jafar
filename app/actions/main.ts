import { actionCreator } from './helpers';
import { IFormState, ISearchStatus } from 'types/main';

export const updateFormFields = actionCreator<Partial<IFormState>>('UPDATE_FORM_FIELDS');
export const updateSearchStatus = actionCreator<Partial<ISearchStatus>>('UPDATE_SEARCH_STATUS');

// export const increment = actionCreatorVoid('INCREMENT_COUNTER');
// export function incrementAsync(delay: number = 1000) {
//   return (dispatch: Function) => {
//     setTimeout(() => {
//       dispatch(increment());
//     }, delay);
//   };
// }
