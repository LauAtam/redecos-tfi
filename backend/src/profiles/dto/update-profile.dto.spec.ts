import { validate } from 'class-validator';
import { UpdateProfileDto } from './update-profile.dto';

describe('UpdateProfileDto', () => {
  it('should pass with valid optional fields', async () => {
    const dto = new UpdateProfileDto();
    dto.first_name = 'Juan';
    dto.last_name = 'Perez';
    dto.default_node_id = '123e4567-e89b-42d3-a456-426614174000'; // Valid v4 UUID

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should pass if all fields are omitted', async () => {
    const dto = new UpdateProfileDto();

    const errors = await validate(dto);
    expect(errors.length).toBe(0);
  });

  it('should fail validation when default_node_id is not a valid UUID', async () => {
    const dto = new UpdateProfileDto();
    dto.default_node_id = 'invalid-uuid';

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    
    const nodeError = errors.find(e => e.property === 'default_node_id');
    expect(nodeError).toBeDefined();
    expect(Object.values(nodeError!.constraints!)).toContain('El ID del nodo debe ser un UUID válido.');
  });
});
